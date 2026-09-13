import { describe, expect, it, vi } from 'vitest';

import { createClaudeAdminUsageClient } from './adminUsage';

const NOW = Date.UTC(2026, 8, 12, 9, 30);
const json = (value: unknown) => new Response(JSON.stringify(value));

describe('Claude admin usage', () => {
  it('uses UTC month bounds, pages, filters workspace, and counts each token class once', async () => {
    const fetcher = vi.fn(async (input: Request | string | URL) => {
      const url = new URL(String(input));
      const isCost = url.pathname.endsWith('cost_report');
      const page = url.searchParams.get('page');
      if (isCost) return json({ data: [{ ending_at: '2026-09-02T00:00:00Z', results: [{ amount: '12.3456', currency: 'USD', workspace_id: 'ws-1' }, { amount: '99', currency: 'USD', workspace_id: 'other' }], starting_at: '2026-09-01T00:00:00Z' }], has_more: false });
      if (!page) return json({ data: [{ ending_at: '2026-09-02T00:00:00Z', results: [{ cache_creation: { ephemeral_1h_input_tokens: 1, ephemeral_5m_input_tokens: 1 }, cache_read_input_tokens: 3, output_tokens: 4, uncached_input_tokens: 1, workspace_id: 'ws-1' }], starting_at: '2026-09-01T00:00:00Z' }], has_more: true, next_page: 'next' });
      return json({ data: [{ ending_at: '2026-09-03T00:00:00Z', results: [{ input_tokens: 10, output_tokens: 5, workspace_id: 'ws-1' }], starting_at: '2026-09-02T00:00:00Z' }], has_more: false });
    });
    const client = createClaudeAdminUsageClient(fetcher);
    const result = await client('sk-ant-admin-secret', 'ws-1', NOW);
    expect(result.metric.tokens).toBe(25);
    expect(result.metric.scope).toBe('workspace');
    expect(result.spend.amountUsdMicros).toBe(123456);
    expect(result.spend.qualifier).toContain('Priority Tier');
    const urls = fetcher.mock.calls.map(([url]) => new URL(String(url)));
    expect(urls[0].searchParams.get('starting_at')).toBe('2026-09-01T00:00:00.000Z');
    expect(urls[0].searchParams.get('ending_at')).toBe('2026-09-12T09:30:00.000Z');
    expect(urls[0].searchParams.getAll('group_by[]')).toEqual(['workspace_id']);
    expect(urls.some((url) => url.searchParams.get('page') === 'next')).toBe(true);
  });

  it('uses a five minute cache without another network call', async () => {
    const fetcher = vi.fn(async (input: Request | string | URL) => json({
      data: [{ results: String(input).includes('cost_report') ? [{ amount: '0', currency: 'USD' }] : [] }],
      has_more: false
    }));
    const client = createClaudeAdminUsageClient(fetcher);
    await client('sk-ant-admin-secret', undefined, NOW);
    await client('sk-ant-admin-secret', undefined, NOW + 60_000);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('never puts the key or response body in an error', async () => {
    const key = 'sk-ant-admin-very-secret';
    const fetcher = vi.fn(async () => new Response(`bad ${key}`, { status: 500 }));
    const error = await createClaudeAdminUsageClient(fetcher)(key, undefined, NOW).catch((value: unknown) => value);
    expect(String(error)).not.toContain(key);
    expect(String(error)).not.toContain('bad');
  });
});
