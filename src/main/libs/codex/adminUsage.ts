import { ADMIN_CACHE_MS, type AIAdminUsage, currentUtcMonth, decimalToMicros, fetchAdminPages, isObject, readBucketResults, safeNonNegativeInteger } from '../aiUsage/admin';

export type CodexAdminUsage = AIAdminUsage;
type Fetcher = typeof fetch;
const endpoint = 'https://api.openai.com/v1/organization';

const pages = (path: string, params: URLSearchParams, key: string, fetcher: Fetcher) => fetchAdminPages({
  endpoint: `${endpoint}/${path}`,
  fetcher,
  headers: { Authorization: `Bearer ${key}` },
  params
});

const projectMatches = (row: Record<string, unknown>, projectId?: string) => !projectId || row.project_id === projectId;

export const createCodexAdminUsageClient = (fetcher: Fetcher = fetch) => {
  let cache: undefined | { key: string; scope?: string; until: number; value: CodexAdminUsage };
  return async (key: string, projectId: string | undefined, now: number): Promise<CodexAdminUsage> => {
    if (cache && cache.key === key && cache.scope === projectId && cache.until > now) return cache.value;
    const { endMs, startMs } = currentUtcMonth(now);
    const params = new URLSearchParams({
      bucket_width: '1d',
      end_time: String(Math.floor(endMs / 1000)),
      start_time: String(Math.floor(startMs / 1000))
    });
    params.append('group_by[]', 'project_id');
    if (projectId) params.append('project_ids[]', projectId);
    const [usageBuckets, costBuckets] = await Promise.all([
      pages('usage/completions', params, key, fetcher),
      pages('costs', params, key, fetcher)
    ]);
    const usageRows = readBucketResults(usageBuckets).filter((row) => projectMatches(row, projectId));
    const costRows = readBucketResults(costBuckets).filter((row) => projectMatches(row, projectId));
    const scope = projectId ? 'project' : 'organization';
    const title = projectId ? 'Project API' : 'Org API';
    const value: CodexAdminUsage = {
      metric: {
        id: 'month',
        label: `${title} tokens`,
        scope,
        source: 'admin',
        title: 'Month',
        tokens: usageRows.reduce((sum, row) => sum + safeNonNegativeInteger(row.input_tokens ?? 0) + safeNonNegativeInteger(row.output_tokens ?? 0), 0)
      },
      reportedAt: now,
      spend: {
        amountUsdMicros: costRows.reduce((sum, row) => {
          if (!isObject(row.amount) || row.amount.currency !== 'usd' || (typeof row.amount.value !== 'number' && typeof row.amount.value !== 'string')) throw new Error('Invalid admin response');
          return sum + decimalToMicros(String(row.amount.value), 1_000_000n);
        }, 0),
        label: projectId ? 'Project API spend' : 'Org API spend',
        period: 'calendar-month',
        scope,
        source: 'admin',
        startsAt: startMs
      }
    };
    cache = { key, scope: projectId, until: now + ADMIN_CACHE_MS, value };
    return value;
  };
};

export const getCodexAdminUsage = createCodexAdminUsageClient();
