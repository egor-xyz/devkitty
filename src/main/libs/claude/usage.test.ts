import { describe, expect, it } from 'vitest';

import {
  computeFiveHour,
  computeWeek,
  dedupe,
  FIVE_HOURS_MS,
  modelBreakdown,
  SEVEN_DAYS_MS,
  type UsageEntry
} from './usage';

const HOUR = 60 * 60 * 1000;
const T0 = Date.UTC(2026, 0, 1, 0, 0, 0); // on an hour boundary

// Block A: two entries in the first hour window.
// Gap > 5h, then Block B: two entries.
// One duplicate requestId that must be dropped.
const entries: UsageEntry[] = [
  { model: 'claude-opus-4-8', requestId: 'a1', tokens: 100, ts: T0 },
  { model: 'claude-opus-4-8', requestId: 'a2', tokens: 200, ts: T0 + HOUR },
  { model: 'claude-sonnet-4-6', requestId: 'a3', tokens: 50, ts: T0 + 7 * HOUR },
  { model: 'claude-opus-4-8', requestId: 'a4', tokens: 400, ts: T0 + 8 * HOUR },
  // duplicate delivery of a4 — same requestId, must not be double counted
  { model: 'claude-opus-4-8', requestId: 'a4', tokens: 400, ts: T0 + 8 * HOUR }
];

describe('dedupe', () => {
  it('drops entries sharing a requestId, keeping the first', () => {
    const out = dedupe(entries);
    expect(out).toHaveLength(4);
    expect(out.map((e) => e.requestId)).toEqual(['a1', 'a2', 'a3', 'a4']);
  });

  it('keeps entries without a requestId', () => {
    const out = dedupe([
      { model: 'm', tokens: 1, ts: 1 },
      { model: 'm', tokens: 2, ts: 2 }
    ]);
    expect(out).toHaveLength(2);
  });
});

describe('computeFiveHour', () => {
  it('reports the active block total and its reset time', () => {
    const now = T0 + 8 * HOUR + 30 * 60 * 1000; // inside block B [T0+7h, T0+12h)
    const w = computeFiveHour(entries, now);

    expect(w.active).toBe(true);
    expect(w.tokens).toBe(450); // 50 + 400
    expect(w.startsAt).toBe(T0 + 7 * HOUR);
    expect(w.resetsAt).toBe(T0 + 7 * HOUR + FIVE_HOURS_MS);
    // cap estimated from the largest historical block (A=300, B=450)
    expect(w.cap).toBe(450);
    expect(w.pct).toBeCloseTo(1);
  });

  it('reports an inactive window when the last block has expired', () => {
    const now = T0 + 20 * HOUR; // block B ended at T0+12h
    const w = computeFiveHour(entries, now);

    expect(w.active).toBe(false);
    expect(w.tokens).toBe(0);
    expect(w.resetsAt).toBe(T0 + 20 * HOUR + FIVE_HOURS_MS); // floored-now + 5h
    expect(w.pct).toBe(0);
  });

  it('handles no entries', () => {
    const w = computeFiveHour([], T0);
    expect(w.tokens).toBe(0);
    expect(w.active).toBe(false);
    expect(w.cap).toBe(0);
    expect(w.pct).toBe(0);
  });
});

describe('computeWeek', () => {
  it('sums a trailing 7-day window and estimates the cap from history', () => {
    const now = T0 + 8 * HOUR + 30 * 60 * 1000;
    const w = computeWeek(entries, now);

    expect(w.tokens).toBe(750); // all four unique entries fall inside 7d
    expect(w.cap).toBe(750); // peak rolling-7d sum is the whole set
    expect(w.pct).toBeCloseTo(1);
    // window rolls as the earliest contributing entry ages out
    expect(w.startsAt).toBe(now - SEVEN_DAYS_MS);
    expect(w.resetsAt).toBe(T0 + SEVEN_DAYS_MS); // earliest entry + 7d
  });

  it('excludes entries older than 7 days', () => {
    const now = T0 + 10 * SEVEN_DAYS_MS;
    const w = computeWeek(entries, now);
    expect(w.tokens).toBe(0);
  });
});

describe('modelBreakdown', () => {
  it('sums tokens per model within a window, largest first', () => {
    const out = modelBreakdown(entries, T0 + 7 * HOUR, T0 + 12 * HOUR);
    expect(out).toEqual([
      { model: 'claude-opus-4-8', tokens: 400 },
      { model: 'claude-sonnet-4-6', tokens: 50 }
    ]);
  });
});
