import { type AIUsageMetric, type AIUsageSpend } from 'types/aiUsage';

import { fetchJson } from './fetchJson';

export const ADMIN_CACHE_MS = 5 * 60 * 1000;
export const MAX_ADMIN_PAGES = 20;

export type AIAdminUsage = {
  metric: AIUsageMetric;
  reportedAt: number;
  spend: AIUsageSpend;
};

type AdminPagesOptions = {
  endpoint: string;
  fetcher: Fetcher;
  headers: Record<string, string>;
  params: URLSearchParams;
};

type Fetcher = typeof fetch;

export const currentUtcMonth = (now: number) => {
  const date = new Date(now);
  return {
    endMs: now,
    startMs: Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
  };
};

export const decimalToMicros = (value: string, unitMicros: bigint): number => {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) throw new Error('Invalid money amount');
  const fraction = match[2] ?? '';
  const scale = 10n ** BigInt(fraction.length);
  const units = BigInt(match[1]) * scale + BigInt(fraction || '0');
  const numerator = units * unitMicros;
  const rounded = (numerator + scale / 2n) / scale;
  if (rounded > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Money amount is too large');
  return Number(rounded);
};

export const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const readPage = (value: unknown): { data: Record<string, unknown>[]; hasMore: boolean; nextPage?: string } => {
  if (!isObject(value) || !Array.isArray(value.data) || !value.data.every(isObject) || typeof value.has_more !== 'boolean') {
    throw new Error('Invalid admin response');
  }
  if (value.has_more && typeof value.next_page !== 'string') throw new Error('Invalid admin response');
  return {
    data: value.data,
    hasMore: value.has_more,
    ...(typeof value.next_page === 'string' ? { nextPage: value.next_page } : {})
  };
};

export const fetchAdminPages = async ({ endpoint, fetcher, headers, params }: AdminPagesOptions): Promise<Record<string, unknown>[]> => {
  const rows: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  let page: string | undefined;

  for (let pageIndex = 0; pageIndex < MAX_ADMIN_PAGES; pageIndex += 1) {
    const pageParams = new URLSearchParams(params);
    if (page) pageParams.set('page', page);
    const response = readPage(await fetchJson(`${endpoint}?${pageParams}`, { fetcher, headers }));
    rows.push(...response.data);
    if (!response.hasMore) return rows;
    if (!response.nextPage || seen.has(response.nextPage)) throw new Error('Invalid admin pagination');
    page = response.nextPage;
    seen.add(page);
  }

  throw new Error('Admin pagination limit reached');
};

export const readBucketResults = (buckets: Record<string, unknown>[]): Record<string, unknown>[] => buckets.flatMap((bucket) => {
  if (!Array.isArray(bucket.results) || !bucket.results.every(isObject)) throw new Error('Invalid admin response');
  return bucket.results;
});

export const safeNonNegativeInteger = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('Invalid usage response');
  return value;
};
