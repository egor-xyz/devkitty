import { type AIAccount, type AIUsage, type AIUsageMetric } from 'types/aiUsage';

import { readCursorStorage } from './storage';

const BODY_LIMIT = 256 * 1024;
const TIMEOUT_MS = 5000;

type Fetch = typeof fetch;
type JsonObject = Record<string, unknown>;

const object = (value: unknown): JsonObject | undefined => value && typeof value === 'object' && !Array.isArray(value)
  ? value as JsonObject
  : undefined;
const number = (value: unknown): number | undefined => typeof value === 'number' && Number.isFinite(value) && value >= 0
  ? value
  : undefined;
const percentPoints = (value: unknown): number | undefined => {
  const raw = number(value);
  if (raw === undefined) return undefined;
  return Math.min(1, raw / 100);
};
const time = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value < 1e12 ? value * 1000 : value;
  if (typeof value !== 'string') return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const poolPercent = (value: unknown): number | undefined => {
  const pool = object(value);
  if (!pool) return undefined;
  const direct = percentPoints(pool.totalPercentUsed ?? pool.percentUsed);
  if (direct !== undefined) return direct;
  const used = number(pool.used);
  const limit = number(pool.limit);
  return used !== undefined && limit !== undefined && limit > 0 ? Math.min(1, used / limit) : undefined;
};

const metric = (id: AIUsageMetric['id'], title: string, pool: unknown): AIUsageMetric | undefined => {
  const data = object(pool);
  const value = poolPercent(data);
  if (!data || value === undefined) return undefined;
  return {
    id,
    label: `${title} usage`,
    percent: value,
    resetsAt: time(data.resetsAt ?? data.resetAt ?? data.billingCycleEnd),
    scope: 'account',
    source: 'provider',
    title
  };
};

const decodeUserId = (token: string): string | undefined => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return undefined;
    const claims: unknown = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    const sub = object(claims)?.sub;
    if (typeof sub !== 'string' || !sub.trim()) return undefined;
    const userId = sub.split('|').at(-1)?.trim();
    return userId || undefined;
  } catch {
    return undefined;
  }
};

const readLimitedText = async (response: Response): Promise<string> => {
  if (!response.body) {
    const text = await response.text();
    if (Buffer.byteLength(text) > BODY_LIMIT) throw new Error('Cursor usage response is too large');
    return text;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > BODY_LIMIT) {
      await reader.cancel();
      throw new Error('Cursor usage response is too large');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
};

export const buildUsage = async (
  account: AIAccount,
  now: number,
  fetcher: Fetch = fetch
): Promise<AIUsage> => {
  const token = readCursorStorage(account.dir)?.accessToken;
  const userId = token && decodeUserId(token);
  if (!token || !userId) throw new Error('Cursor login is not available');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let body: unknown;
  try {
    const response = await fetcher('https://cursor.com/api/usage-summary', {
      headers: {
        Accept: 'application/json',
        Cookie: `WorkosCursorSessionToken=${encodeURIComponent(`${userId}::${token}`)}`
      },
      signal: controller.signal
    });
    if (!response.ok) throw new Error('Cursor usage request failed');
    try {
      body = JSON.parse(await readLimitedText(response));
    } catch (error) {
      if (error instanceof Error && error.message.includes('too large')) throw error;
      throw new Error('Cursor usage response is invalid');
    }
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Cursor usage request timed out');
    if (error instanceof Error && error.message.startsWith('Cursor usage')) throw error;
    throw new Error('Cursor usage request failed');
  } finally {
    clearTimeout(timeout);
  }

  const root = object(body);
  const individual = object(root?.individualUsage);
  const plan = object(individual?.plan);
  if (!root || !individual || !plan) throw new Error('Cursor usage response is invalid');

  const cursorPool = plan.cursorModels ?? individual.cursorModels;
  const otherPool = plan.otherModels ?? individual.otherModels;
  const split = [
    metric('cursor-models', 'Cursor models', cursorPool),
    metric('other-models', 'Other models', otherPool)
  ].filter((row): row is AIUsageMetric => Boolean(row));
  const planMetric = metric('month', 'Plan', plan);
  const grokMetric = metric('grok-weekly', 'Grok Bot', individual.grokBot ?? root.grokBotUsage);
  const metrics = split.length > 0 ? split : planMetric ? [planMetric] : [];
  if (grokMetric) metrics.push(grokMetric);

  const onDemand = object(individual.onDemand ?? object(root.teamUsage)?.onDemand);
  const usedCents = number(onDemand?.used);
  const limitCents = number(onDemand?.limit);
  const spend = usedCents !== undefined ? {
    amountUsdMicros: Math.round(usedCents * 10_000),
    label: 'On-demand' as const,
    ...(limitCents === undefined ? {} : { limitUsdMicros: Math.round(limitCents * 10_000) }),
    period: 'billing-cycle' as const,
    scope: 'account' as const,
    source: 'provider' as const,
    startsAt: time(onDemand?.startsAt ?? onDemand?.billingCycleStart)
  } : undefined;

  if (metrics.length === 0 && !spend) throw new Error('Cursor usage response is invalid');
  return { account, computedAt: now, metrics, reportedAt: now, spend };
};
