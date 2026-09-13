import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./lastUsage', () => ({ readReportedUsage: vi.fn() }));
vi.mock('./transcripts', () => ({ readEntries: vi.fn() }));

import type { ClaudeAccount } from 'types/claudeUsage';

import { buildUsage } from './getUsage';
import { readReportedUsage } from './lastUsage';
import { readEntries } from './transcripts';

const NOW = Date.UTC(2026, 0, 15, 12);
const DAY = 86_400_000;
const account: ClaudeAccount = { dir: '/Users/test/.claude', label: 'claude' };
const entries = [
  { model: 'claude-opus', requestId: 'a', tokens: 100, ts: NOW - 1000 },
  { model: 'claude-sonnet', requestId: 'b', tokens: 50, ts: NOW - 6 * DAY }
];

describe('Claude common usage model', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps provider quota and local token detail separate', async () => {
    vi.mocked(readEntries).mockResolvedValue(entries);
    vi.mocked(readReportedUsage).mockReturnValue({
      capturedAt: NOW - 500,
      fiveHour: { pct: 0.42, resetsAt: NOW + 1000 },
      sevenDay: { pct: 0.1, resetsAt: NOW + 2000 }
    });
    const result = await buildUsage(account, NOW);
    expect(result.account).toEqual({ ...account, provider: 'claude' });
    expect(result.reportedAt).toBe(NOW - 500);
    expect(result.metrics).toEqual([
      expect.objectContaining({ id: 'five-hour', percent: 0.42, resetsAt: NOW + 1000, source: 'provider', tokens: 100, tokensPeriod: 'provider-period' }),
      expect.objectContaining({ id: 'seven-day', percent: 0.1, resetsAt: NOW + 2000, source: 'provider', tokens: 150, tokensPeriod: 'provider-period' })
    ]);
  });

  it('shows local tokens without inventing a quota percent', async () => {
    vi.mocked(readEntries).mockResolvedValue(entries);
    vi.mocked(readReportedUsage).mockReturnValue(null);
    const result = await buildUsage(account, NOW);
    expect(result.reportedAt).toBeUndefined();
    expect(result.metrics[0]).toMatchObject({ label: '5H · Quota unavailable', source: 'local', tokens: 100, tokensPeriod: 'trailing-window' });
    expect(result.metrics[0]).not.toHaveProperty('percent');
    expect(result.metrics[1]).toMatchObject({ label: '7D · Quota unavailable', source: 'local', tokens: 150 });
  });

  it('reads the selected account and time', async () => {
    vi.mocked(readEntries).mockResolvedValue([]);
    vi.mocked(readReportedUsage).mockReturnValue(null);
    await buildUsage(account, NOW);
    expect(readReportedUsage).toHaveBeenCalledWith(account.dir);
    expect(readEntries).toHaveBeenCalledWith(account.dir, NOW);
  });

  it('excludes local tokens from before the current provider period', async () => {
    vi.mocked(readEntries).mockResolvedValue([
      { model: 'claude-opus', requestId: 'old', tokens: 900, ts: NOW - 4.5 * 60 * 60 * 1000 },
      { model: 'claude-sonnet', requestId: 'current', tokens: 100, ts: NOW - 1000 }
    ]);
    vi.mocked(readReportedUsage).mockReturnValue({
      capturedAt: NOW - 500,
      fiveHour: { pct: 0.2, resetsAt: NOW + 60 * 60 * 1000 }
    });
    const result = await buildUsage(account, NOW);
    expect(result.metrics[0]).toMatchObject({
      models: [{ model: 'claude-sonnet', tokens: 100 }],
      tokens: 100,
      tokensPeriod: 'provider-period'
    });
    expect(result.metrics[1]).toMatchObject({ tokens: 1000, tokensPeriod: 'trailing-window' });
  });

  it.each([0, NOW - 1])('does not use an old quota reset at %s', async (resetsAt) => {
    vi.mocked(readEntries).mockResolvedValue(entries);
    vi.mocked(readReportedUsage).mockReturnValue({
      capturedAt: NOW - 500,
      fiveHour: { pct: 0.9, resetsAt },
      sevenDay: { pct: 0.8, resetsAt }
    });
    const result = await buildUsage(account, NOW);
    expect(result.reportedAt).toBeUndefined();
    expect(result.metrics[0]).toMatchObject({ label: '5H · Quota unavailable', source: 'local', tokens: 100 });
    expect(result.metrics[0]).not.toHaveProperty('percent');
    expect(result.metrics[1]).toMatchObject({ label: '7D · Quota unavailable', source: 'local', tokens: 150 });
    expect(result.metrics[1]).not.toHaveProperty('percent');
  });
});
