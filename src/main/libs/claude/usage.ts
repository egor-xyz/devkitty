export const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
// How far back to read history. The 5h and 7d figures only ever look at the
// trailing window, but the "cap" each bar fills toward is the peak comparable
// window across this lookback — so it must span several weeks or the current
// window is always its own peak and every bar pins to 100%.
export const LOOKBACK_MS = 28 * 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export type ModelBreakdown = {
  model: string;
  tokens: number;
};

export type UsageEntry = {
  model: string;
  requestId?: string;
  tokens: number;
  ts: number; // epoch ms
};

export type UsageWindow = {
  active: boolean;
  cap: number; // estimated ceiling (largest historical usage for this window shape)
  pct: number; // tokens / cap, clamped to [0, 1]
  resetsAt: number; // epoch ms when the window frees capacity
  startsAt: number; // epoch ms of the window start
  tokens: number;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const floorToHour = (ts: number) => ts - (ts % HOUR_MS);

/**
 * Claude Code can write the same assistant turn to a transcript more than once
 * (retries, resumed sessions). `requestId` identifies a billed request, so the
 * first occurrence wins and later copies are dropped. Entries with no
 * requestId are always kept — they cannot be proven duplicate.
 */
export const dedupe = (entries: UsageEntry[]): UsageEntry[] => {
  const seen = new Set<string>();
  const out: UsageEntry[] = [];

  for (const e of entries) {
    if (e.requestId) {
      if (seen.has(e.requestId)) continue;
      seen.add(e.requestId);
    }
    out.push(e);
  }

  return out;
};

type Block = { endsAt: number; startsAt: number; tokens: number };

/**
 * Groups entries into 5-hour activity blocks the way Claude Code does: a block
 * opens at the first message (floored to the hour) and absorbs later messages
 * until one lands more than 5h after the block start or more than 5h after the
 * previous message, which opens a fresh block.
 */
const toBlocks = (entries: UsageEntry[]): Block[] => {
  const sorted = [...entries].sort((a, b) => a.ts - b.ts);
  const blocks: Block[] = [];
  let start = 0;
  let lastTs = 0;
  let tokens = 0;
  let open = false;

  const flush = () => {
    if (open) blocks.push({ endsAt: start + FIVE_HOURS_MS, startsAt: start, tokens });
  };

  for (const e of sorted) {
    if (!open) {
      start = floorToHour(e.ts);
      ({ tokens } = e);
      lastTs = e.ts;
      open = true;
      continue;
    }

    if (e.ts - start > FIVE_HOURS_MS || e.ts - lastTs > FIVE_HOURS_MS) {
      flush();
      start = floorToHour(e.ts);
      ({ tokens } = e);
      lastTs = e.ts;
      continue;
    }

    tokens += e.tokens;
    lastTs = e.ts;
  }

  flush();
  return blocks;
};

export const computeFiveHour = (entries: UsageEntry[], now: number): UsageWindow => {
  const clean = dedupe(entries);
  const blocks = toBlocks(clean);
  const cap = blocks.reduce((max, b) => Math.max(max, b.tokens), 0);
  const active = blocks.find((b) => now >= b.startsAt && now < b.endsAt);

  if (!active) {
    return {
      active: false,
      cap,
      pct: 0,
      resetsAt: floorToHour(now) + FIVE_HOURS_MS,
      startsAt: floorToHour(now),
      tokens: 0
    };
  }

  return {
    active: true,
    cap,
    pct: cap > 0 ? clamp01(active.tokens / cap) : 0,
    resetsAt: active.endsAt,
    startsAt: active.startsAt,
    tokens: active.tokens
  };
};

/**
 * Largest sum of any trailing `windowMs` slice across history, sampled at every
 * entry (a sliding-window maximum peaks at some entry boundary). Two pointers,
 * O(n) over timestamp-sorted entries.
 */
const maxRollingSum = (sorted: UsageEntry[], windowMs: number): number => {
  let left = 0;
  let sum = 0;
  let max = 0;

  for (let right = 0; right < sorted.length; right++) {
    sum += sorted[right].tokens;
    while (sorted[right].ts - sorted[left].ts > windowMs) {
      sum -= sorted[left].tokens;
      left++;
    }
    max = Math.max(max, sum);
  }

  return max;
};

export const computeWeek = (entries: UsageEntry[], now: number): UsageWindow => {
  const clean = dedupe(entries).sort((a, b) => a.ts - b.ts);
  const since = now - SEVEN_DAYS_MS;
  const inWindow = clean.filter((e) => e.ts > since && e.ts <= now);
  const tokens = inWindow.reduce((sum, e) => sum + e.tokens, 0);
  const cap = Math.max(maxRollingSum(clean, SEVEN_DAYS_MS), tokens);
  const earliest = inWindow.length ? inWindow[0].ts : now;

  return {
    active: tokens > 0,
    cap,
    pct: cap > 0 ? clamp01(tokens / cap) : 0,
    resetsAt: earliest + SEVEN_DAYS_MS,
    startsAt: since,
    tokens
  };
};

// Total tokens across a trailing window ending at `now` — used for the "you
// ran N tokens" line, independent of how the % is sourced.
export const tokensInWindow = (entries: UsageEntry[], now: number, windowMs: number): number =>
  dedupe(entries)
    .filter((e) => e.ts > now - windowMs && e.ts <= now)
    .reduce((sum, e) => sum + e.tokens, 0);

export const modelBreakdown = (entries: UsageEntry[], fromTs: number, toTs: number): ModelBreakdown[] => {
  const totals = new Map<string, number>();

  for (const e of dedupe(entries)) {
    if (e.ts < fromTs || e.ts > toTs) continue;
    totals.set(e.model, (totals.get(e.model) ?? 0) + e.tokens);
  }

  return [...totals.entries()]
    .map(([model, tokens]) => ({ model, tokens }))
    .sort((a, b) => b.tokens - a.tokens);
};
