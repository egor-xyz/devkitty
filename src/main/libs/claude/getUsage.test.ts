import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./lastUsage', () => ({
  readReportedUsage: vi.fn()
}));

vi.mock('./transcripts', () => ({
  readEntries: vi.fn()
}));

import type { ClaudeAccount } from 'types/claudeUsage';

import { buildUsage } from './getUsage';
import { readReportedUsage } from './lastUsage';
import { readEntries } from './transcripts';
import {
  computeFiveHour,
  computeWeek,
  FIVE_HOURS_MS,
  modelBreakdown,
  SEVEN_DAYS_MS,
  tokensInWindow,
  type UsageEntry
} from './usage';

const mockReadReportedUsage = vi.mocked(readReportedUsage);
const mockReadEntries = vi.mocked(readEntries);

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 0, 15, 12, 0, 0);

const account: ClaudeAccount = { dir: '/Users/test/.claude', label: 'claude' };

// Two entries well inside the 5h window (different models), plus one entry
// 6 days back — inside the 7d window but outside the 5h window — so both
// tokensInWindow and modelBreakdown produce non-trivial, differing output
// for fiveHour vs week.
const entries: UsageEntry[] = [
  { model: 'claude-opus-4-8', requestId: 'r1', tokens: 100, ts: NOW - 1000 },
  { model: 'claude-sonnet-4-6', requestId: 'r2', tokens: 50, ts: NOW - 2000 },
  { model: 'claude-opus-4-8', requestId: 'r3', tokens: 200, ts: NOW - 6 * DAY }
];

describe('buildUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers server-reported pct/resetsAt for both windows when present, keeping local tokens/models', async () => {
    mockReadEntries.mockResolvedValue(entries);
    const reported = {
      capturedAt: NOW - 500,
      fiveHour: { pct: 0.42, resetsAt: NOW + 1_000_000 },
      sevenDay: { pct: 0.1, resetsAt: NOW + 2_000_000 }
    };
    mockReadReportedUsage.mockReturnValue(reported);

    const result = await buildUsage(account, NOW);

    expect(result.account).toBe(account);
    expect(result.computedAt).toBe(NOW);
    expect(result.reportedAt).toBe(reported.capturedAt);

    expect(result.fiveHour.reported).toBe(true);
    expect(result.fiveHour.pct).toBe(0.42);
    expect(result.fiveHour.resetsAt).toBe(reported.fiveHour.resetsAt);
    expect(result.fiveHour.active).toBe(true);
    expect(result.fiveHour.tokens).toBe(150);
    expect(result.fiveHour.models).toEqual([
      { model: 'claude-opus-4-8', tokens: 100 },
      { model: 'claude-sonnet-4-6', tokens: 50 }
    ]);
    const fiveHourEstimate = computeFiveHour(entries, NOW);
    expect(result.fiveHour.cap).toBe(fiveHourEstimate.cap);
    expect(result.fiveHour.startsAt).toBe(fiveHourEstimate.startsAt);

    expect(result.week.reported).toBe(true);
    expect(result.week.pct).toBe(0.1);
    expect(result.week.resetsAt).toBe(reported.sevenDay.resetsAt);
    expect(result.week.active).toBe(true);
    expect(result.week.tokens).toBe(350);
    expect(result.week.models).toEqual([
      { model: 'claude-opus-4-8', tokens: 300 },
      { model: 'claude-sonnet-4-6', tokens: 50 }
    ]);
    const weekEstimate = computeWeek(entries, NOW);
    expect(result.week.cap).toBe(weekEstimate.cap);
    expect(result.week.startsAt).toBe(weekEstimate.startsAt);
  });

  it('falls back to the local estimate for both windows when nothing is reported', async () => {
    mockReadEntries.mockResolvedValue(entries);
    mockReadReportedUsage.mockReturnValue(null);

    const result = await buildUsage(account, NOW);

    expect(result.reportedAt).toBeUndefined();

    const fiveHourEstimate = computeFiveHour(entries, NOW);
    expect(result.fiveHour.reported).toBe(false);
    expect(result.fiveHour.pct).toBe(fiveHourEstimate.pct);
    expect(result.fiveHour.active).toBe(fiveHourEstimate.active);
    expect(result.fiveHour.resetsAt).toBe(fiveHourEstimate.resetsAt);
    expect(result.fiveHour.cap).toBe(fiveHourEstimate.cap);
    expect(result.fiveHour.startsAt).toBe(fiveHourEstimate.startsAt);
    expect(result.fiveHour.tokens).toBe(tokensInWindow(entries, NOW, FIVE_HOURS_MS));
    expect(result.fiveHour.models).toEqual(modelBreakdown(entries, NOW - FIVE_HOURS_MS, NOW));

    const weekEstimate = computeWeek(entries, NOW);
    expect(result.week.reported).toBe(false);
    expect(result.week.pct).toBe(weekEstimate.pct);
    expect(result.week.active).toBe(weekEstimate.active);
    expect(result.week.resetsAt).toBe(weekEstimate.resetsAt);
    expect(result.week.cap).toBe(weekEstimate.cap);
    expect(result.week.startsAt).toBe(weekEstimate.startsAt);
    expect(result.week.tokens).toBe(tokensInWindow(entries, NOW, SEVEN_DAYS_MS));
    expect(result.week.models).toEqual(modelBreakdown(entries, NOW - SEVEN_DAYS_MS, NOW));
  });

  it('applies the reported figure only to the window that has one, falling back for the other', async () => {
    mockReadEntries.mockResolvedValue(entries);
    const reported = {
      capturedAt: NOW - 500,
      fiveHour: { pct: 0.7, resetsAt: NOW + 9999 },
      sevenDay: undefined
    };
    mockReadReportedUsage.mockReturnValue(reported);

    const result = await buildUsage(account, NOW);

    expect(result.fiveHour.reported).toBe(true);
    expect(result.fiveHour.pct).toBe(0.7);
    expect(result.fiveHour.resetsAt).toBe(reported.fiveHour.resetsAt);
    expect(result.fiveHour.active).toBe(true);

    const weekEstimate = computeWeek(entries, NOW);
    expect(result.week.reported).toBe(false);
    expect(result.week.pct).toBe(weekEstimate.pct);
    expect(result.week.active).toBe(weekEstimate.active);
    expect(result.week.resetsAt).toBe(weekEstimate.resetsAt);
  });

  it('handles no entries at all, regardless of whether usage is reported', async () => {
    mockReadEntries.mockResolvedValue([]);

    mockReadReportedUsage.mockReturnValue(null);
    const unreported = await buildUsage(account, NOW);
    expect(unreported.fiveHour.tokens).toBe(0);
    expect(unreported.fiveHour.models).toEqual([]);
    expect(unreported.week.tokens).toBe(0);
    expect(unreported.week.models).toEqual([]);

    mockReadReportedUsage.mockReturnValue({
      capturedAt: NOW,
      fiveHour: { pct: 0.5, resetsAt: NOW + 1 },
      sevenDay: { pct: 0.5, resetsAt: NOW + 1 }
    });
    const reportedResult = await buildUsage(account, NOW);
    expect(reportedResult.fiveHour.tokens).toBe(0);
    expect(reportedResult.fiveHour.models).toEqual([]);
    expect(reportedResult.week.tokens).toBe(0);
    expect(reportedResult.week.models).toEqual([]);
  });

  it('passes account and now through unchanged', async () => {
    mockReadEntries.mockResolvedValue([]);
    mockReadReportedUsage.mockReturnValue(null);

    const result = await buildUsage(account, NOW);

    expect(result.account).toBe(account);
    expect(result.computedAt).toBe(NOW);
  });

  it('reads reported usage and transcript entries for the given account dir and timestamp', async () => {
    mockReadEntries.mockResolvedValue([]);
    mockReadReportedUsage.mockReturnValue(null);

    await buildUsage(account, NOW);

    expect(mockReadReportedUsage).toHaveBeenCalledWith(account.dir);
    expect(mockReadEntries).toHaveBeenCalledWith(account.dir, NOW);
  });
});
