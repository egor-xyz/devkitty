import { describe, expect, it, vi } from 'vitest';

import { createCodexAdminUsageClient } from './adminUsage';

const NOW = Date.UTC(2026, 8, 12, 9, 30);
const json = (value: unknown) => new Response(JSON.stringify(value));

describe('Codex admin usage', () => {
  it('uses UTC month bounds, pages, project scope, tokens, and dollar values', async () => {
    const fetcher = vi.fn(async (input: Request | string | URL) => {
      const url = new URL(String(input));
      const isCost = url.pathname.endsWith('/costs');
      const page = url.searchParams.get('page');
      if (isCost) return json({ data: [{ results: [{ amount: { currency: 'usd', value: '1.234567' }, project_id: 'proj-1' }] }], has_more: false });
      if (!page) return json({ data: [{ results: [{ input_tokens: 4, output_tokens: 6, project_id: 'proj-1' }] }], has_more: true, next_page: 'next' });
      return json({ data: [{ results: [{ input_tokens: 5, output_tokens: 5, project_id: 'proj-1' }] }], has_more: false });
    });
    const result = await createCodexAdminUsageClient(fetcher)('sk-admin-secret', 'proj-1', NOW);
    expect(result.metric.tokens).toBe(20);
    expect(result.metric.scope).toBe('project');
    expect(result.spend.amountUsdMicros).toBe(1234567);
    const urls = fetcher.mock.calls.map(([url]) => new URL(String(url)));
    expect(urls[0].searchParams.get('start_time')).toBe(String(Date.UTC(2026, 8, 1) / 1000));
    expect(urls[0].searchParams.get('end_time')).toBe(String(NOW / 1000));
    expect(urls[0].searchParams.getAll('project_ids[]')).toEqual(['proj-1']);
  });

  it('uses the cache for the footer poll', async () => {
    const fetcher = vi.fn(async () => json({ data: [], has_more: false }));
    const client = createCodexAdminUsageClient(fetcher);
    await client('sk-admin-secret', undefined, NOW);
    await client('sk-admin-secret', undefined, NOW + 60_000);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
