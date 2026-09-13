import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./storage', () => ({ readCursorStorage: vi.fn() }));

import { type AIAccount } from 'types/aiUsage';

import { buildUsage } from './getUsage';
import { readCursorStorage } from './storage';

const NOW = Date.UTC(2026, 8, 12, 10);
const account: AIAccount = { dir: '/cursor/storage', label: 'cursor', provider: 'cursor' };
const encodedClaims = Buffer.from(JSON.stringify({ sub: 'auth0|user-id' })).toString('base64url');
const sessionValue = ['e30', encodedClaims, 'signature'].join('.');
const response = (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), init);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readCursorStorage).mockReturnValue({ accessToken: sessionValue, grokInstalled: false });
});

describe('Cursor usage', () => {
  it('maps two monthly pools, separate Grok use, and shared spend once', async () => {
    const fetcher = vi.fn(async () => response({
      individualUsage: {
        grokBot: { resetsAt: '2026-09-14T00:00:00Z', totalPercentUsed: 25 },
        onDemand: { limit: 5000, used: 125 },
        plan: {
          cursorModels: { limit: 1000, used: 200 },
          otherModels: { totalPercentUsed: 50 }
        }
      }
    }));
    const result = await buildUsage(account, NOW, fetcher);
    expect(result.metrics.map(({ id, percent }) => ({ id, percent }))).toEqual([
      { id: 'cursor-models', percent: 0.2 },
      { id: 'other-models', percent: 0.5 },
      { id: 'grok-weekly', percent: 0.25 }
    ]);
    expect(result.spend).toMatchObject({ amountUsdMicros: 1_250_000, limitUsdMicros: 50_000_000 });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('uses one plan meter when split pools are absent and clamps large percent values', async () => {
    const result = await buildUsage(account, NOW, vi.fn(async () => response({
      individualUsage: { plan: { totalPercentUsed: 150 } }
    })));
    expect(result.metrics).toEqual([expect.objectContaining({ id: 'month', percent: 1, title: 'Plan' })]);
  });

  it('does not invent Grok usage from its installed flag', async () => {
    vi.mocked(readCursorStorage).mockReturnValue({ accessToken: sessionValue, grokInstalled: true });
    const result = await buildUsage(account, NOW, vi.fn(async () => response({
      individualUsage: { plan: { totalPercentUsed: 5 } }
    })));
    expect(result.metrics.map(({ id }) => id)).toEqual(['month']);
  });

  it('returns on-demand spend when no exact limit is available', async () => {
    const result = await buildUsage(account, NOW, vi.fn(async () => response({
      individualUsage: { onDemand: { used: 125 }, plan: { totalPercentUsed: 5 } }
    })));
    expect(result.spend).toMatchObject({ amountUsdMicros: 1_250_000, label: 'On-demand' });
    expect(result.spend).not.toHaveProperty('limitUsdMicros');
  });

  it.each([
    ['HTTP error', async () => response({}, { status: 500 })],
    ['invalid JSON', async () => new Response('{bad')],
    ['bad schema', async () => response({ individualUsage: { plan: { totalPercentUsed: -1 } } })],
    ['large body', async () => new Response('x'.repeat(256 * 1024 + 1))]
  ])('fails safely for %s', async (_name, fetcher) => {
    await expect(buildUsage(account, NOW, vi.fn(fetcher))).rejects.toThrow(/^Cursor usage/);
  });

  it('rejects a bad login token without calling the network', async () => {
    vi.mocked(readCursorStorage).mockReturnValue({ accessToken: 'bad', grokInstalled: false });
    const fetcher = vi.fn();
    await expect(buildUsage(account, NOW, fetcher)).rejects.toThrow('Cursor login is not available');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('stops a request after the timeout', async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn((_url: Request | string | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('stopped')));
      }));
      const pending = buildUsage(account, NOW, fetcher);
      const assertion = expect(pending).rejects.toThrow('Cursor usage request timed out');
      await vi.advanceTimersByTimeAsync(5000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});
