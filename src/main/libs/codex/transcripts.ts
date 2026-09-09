import fs from 'fs';
import path from 'path';
import readline from 'readline';

import { LOOKBACK_MS, type UsageEntry } from '../claude/usage';

const MAX_FILES = 2000;
const MAX_LINE_BYTES = 1024 * 1024;

/** Recent session files, without following symlink directories or scanning unbounded trees. */
export const sessionFiles = (dir: string, now: number): string[] => {
  const found: { file: string; modified: number }[] = [];
  let visited = 0;
  const visit = (folder: string, depth: number) => {
    if (depth > 8 || visited++ > 10000) return;
    try {
      for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
        const file = path.join(folder, item.name);
        if (item.isDirectory()) visit(file, depth + 1);
        else if (item.isFile() && item.name.endsWith('.jsonl')) {
          const stat = fs.statSync(file);
          if (stat.size > 0 && stat.mtimeMs >= now - LOOKBACK_MS) found.push({ file, modified: stat.mtimeMs });
        }
      }
    } catch {
      // A running CLI can move a file while discovery is in progress.
    }
  };
  visit(path.join(dir, 'sessions'), 0);
  return found.sort((a, b) => b.modified - a.modified || a.file.localeCompare(b.file)).slice(0, MAX_FILES).map(({ file }) => file);
};

export type ReportedWindow = { capturedAt: number; durationMs: number; pct: number; resetsAt: number };
export type Snapshot = { capturedAt: number; fiveHour?: ReportedWindow; planCapturedAt?: number; planType?: string; week?: ReportedWindow };
type FileResult = { entries: ParsedEntry[]; modified: number; parents: Map<string, string>; reported?: Snapshot; size: number };
type ParsedEntry = UsageEntry & { fingerprint: string; session: string };
type Payload = {
  forked_from_id?: unknown;
  id?: unknown;
  info?: { last_token_usage?: Record<string, unknown>; total_token_usage?: Record<string, unknown> };
  model?: unknown;
  parent_thread_id?: unknown;
  rate_limits?: RateLimits;
  session_id?: unknown;
  source?: { subagent?: { thread_spawn?: { parent_thread_id?: unknown } } };
  type?: unknown;
};
type RateLimits = { limit_id?: unknown; plan_type?: unknown; primary?: RateWindow; secondary?: RateWindow };
type RateWindow = { resets_at?: unknown; used_percent?: unknown; window_minutes?: unknown };
const cache = new Map<string, FileResult>();

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const tokenTotal = (usage: Record<string, unknown> | undefined): number | undefined => {
  if (!usage) return undefined;
  if (finite(usage.total_tokens)) return usage.total_tokens;
  if (!finite(usage.input_tokens) || !finite(usage.output_tokens)) return undefined;
  // cached input and reasoning output are subsets, not additional tokens.
  return usage.input_tokens + usage.output_tokens;
};

const snapshot = (value: RateLimits | undefined, ts: number, now: number): Snapshot | undefined => {
  if (!value || (value.limit_id && value.limit_id !== 'codex')) return undefined;
  const result: Snapshot = { capturedAt: ts, planCapturedAt: ts, planType: typeof value.plan_type === 'string' ? value.plan_type : undefined };
  for (const window of [value.primary, value.secondary]) {
    if (!window || !finite(window.used_percent) || window.used_percent > 100 || !finite(window.resets_at) || !finite(window.window_minutes)) continue;
    const resetsAt = window.resets_at * 1000;
    if (resetsAt <= now || resetsAt <= ts) continue;
    const parsed = { capturedAt: ts, durationMs: window.window_minutes * 60000, pct: window.used_percent / 100, resetsAt };
    if (window.window_minutes === 300) result.fiveHour = parsed;
    if (window.window_minutes === 10080) result.week = parsed;
  }
  return result.fiveHour || result.week ? result : undefined;
};

const mergeSnapshots = (old: Snapshot | undefined, next: Snapshot | undefined, now: number): Snapshot | undefined => {
  const [latestPlan] = [old, next].filter((value): value is Snapshot => Boolean(value?.planType)).sort((a, b) => (b.planCapturedAt ?? 0) - (a.planCapturedAt ?? 0));
  const result: Snapshot = { capturedAt: now, planCapturedAt: latestPlan?.planCapturedAt, planType: latestPlan?.planType };
  for (const key of ['fiveHour', 'week'] as const) {
    const valid = [old, next]
      .filter((value) => !value?.planType || !result.planType || value.planType === result.planType)
      .map((value) => value?.[key])
      .filter((window): window is ReportedWindow => Boolean(window && window.resetsAt > now));
    [result[key]] = valid.sort((a, b) => b.capturedAt - a.capturedAt);
    if (result[key]) result.capturedAt = Math.min(result.capturedAt, result[key].capturedAt);
  }
  return result.fiveHour || result.week ? result : undefined;
};

export const readTranscripts = async (dir: string, now: number): Promise<{ entries: UsageEntry[]; reported?: Snapshot }> => {
  const entries: ParsedEntry[] = [];
  const parents = new Map<string, string>();
  const realFiles = new Set<string>();
  let reported: Snapshot | undefined;
  // Sequential streams intentionally bound simultaneous file descriptors and memory.
  for (const file of sessionFiles(dir, now)) {
    let input: fs.ReadStream | undefined;
    let lines: readline.Interface | undefined;
    try {
      const real = await fs.promises.realpath(file);
      if (realFiles.has(real)) continue;
      realFiles.add(real);
      const { mtimeMs, size } = await fs.promises.stat(file);
      const cached = cache.get(real);
      if (cached?.size === size && cached.modified === mtimeMs) {
        for (const entry of cached.entries) if (entry.ts >= now - LOOKBACK_MS && entry.ts <= now) entries.push(entry);
        for (const [child, parent] of cached.parents) parents.set(child, parent);
        reported = mergeSnapshots(reported, cached.reported, now);
        continue;
      }
      const result: FileResult = { entries: [], modified: mtimeMs, parents: new Map(), size };
      input = fs.createReadStream(file, { end: size - 1 });
      lines = readline.createInterface({ crlfDelay: Infinity, input });
      let session = real;
      let forked = false;
      let model = 'unknown';
      let previous: number | undefined;
      const applyMetadata = (payload: Payload | undefined) => {
        const id = payload?.id ?? payload?.session_id;
        if (typeof id === 'string') session = id;
        const parent = payload?.forked_from_id ?? payload?.parent_thread_id ?? payload?.source?.subagent?.thread_spawn?.parent_thread_id;
        if (typeof parent === 'string' && parent !== session) { result.parents.set(session, parent); forked = true; }
      };
      for await (const line of lines) {
        if (line.length > MAX_LINE_BYTES) continue;
        let row: null | { payload?: Payload; timestamp?: string; type?: unknown };
        try { row = JSON.parse(line); } catch { continue; }
        if (!row || typeof row !== 'object') continue;
        if (row.type === 'session_meta') {
          applyMetadata(row.payload);
          continue;
        }
        if (row.type === 'turn_context') {
          if (typeof row.payload?.model === 'string') ({ model } = row.payload);
          continue;
        }
        if (row.type !== 'event_msg' || row.payload?.type !== 'token_count') continue;
        const ts = Date.parse(row.timestamp ?? '');
        const total = tokenTotal(row.payload.info?.total_token_usage);
        const last = tokenTotal(row.payload.info?.last_token_usage);
        let tokens = last ?? 0;
        if (total !== undefined) {
          if (previous !== undefined) tokens = total >= previous ? total - previous : last ?? total;
          else tokens = last ?? (forked ? 0 : total);
          previous = total;
        }
        if (!Number.isFinite(ts) || ts > now || ts < now - LOOKBACK_MS) continue;
        const current = snapshot(row.payload.rate_limits, ts, now);
        result.reported = mergeSnapshots(result.reported, current, now);
        if (tokens > 0) result.entries.push({ fingerprint: `${ts}:${total ?? ''}:${last ?? ''}`, model, session, tokens, ts });
      }
      for (const entry of result.entries) entries.push(entry);
      for (const [child, parent] of result.parents) parents.set(child, parent);
      reported = mergeSnapshots(reported, result.reported, now);
      cache.set(real, result);
      if (cache.size > MAX_FILES) cache.delete(cache.keys().next().value!);
    } catch {
      // Ignore unreadable, concurrently deleted, or partially written transcripts.
    } finally {
      lines?.close();
      input?.destroy();
    }
  }
  const lineage = (session: string) => {
    const visited = new Set<string>();
    while (parents.has(session) && !visited.has(session)) {
      visited.add(session);
      session = parents.get(session)!;
    }
    return session;
  };
  const seen = new Set<string>();
  const clean = entries.sort((a, b) => a.ts - b.ts).filter((entry) => {
    const key = `${lineage(entry.session)}:${entry.fingerprint}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(({ model, tokens, ts }) => ({ model, tokens, ts }));
  return { entries: clean, reported };
};
