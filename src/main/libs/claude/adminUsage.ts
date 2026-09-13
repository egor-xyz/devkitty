import { ADMIN_CACHE_MS, type AIAdminUsage, currentUtcMonth, decimalToMicros, fetchAdminPages, isObject, readBucketResults, safeNonNegativeInteger } from '../aiUsage/admin';

export type ClaudeAdminUsage = AIAdminUsage;
type Fetcher = typeof fetch;

const endpoint = 'https://api.anthropic.com/v1/organizations';
const headers = (key: string) => ({ 'anthropic-version': '2023-06-01', 'x-api-key': key });

const workspaceMatches = (row: Record<string, unknown>, workspaceId?: string) => !workspaceId || row.workspace_id === workspaceId;

const pages = (path: string, params: URLSearchParams, key: string, fetcher: Fetcher) => fetchAdminPages({
  endpoint: `${endpoint}/${path}`,
  fetcher,
  headers: headers(key),
  params
});

const usageTokens = (row: Record<string, unknown>): number => {
  // Anthropic reports uncached input separately from both cache classes.
  const input = row.uncached_input_tokens ?? row.input_tokens ?? 0;
  const cacheCreation = row.cache_creation ?? {};
  if (!isObject(cacheCreation)) throw new Error('Invalid admin response');
  return safeNonNegativeInteger(input)
    + safeNonNegativeInteger(cacheCreation.ephemeral_1h_input_tokens ?? 0)
    + safeNonNegativeInteger(cacheCreation.ephemeral_5m_input_tokens ?? 0)
    + safeNonNegativeInteger(row.cache_read_input_tokens ?? 0)
    + safeNonNegativeInteger(row.output_tokens ?? 0);
};

const costMicros = (row: Record<string, unknown>): number => {
  if (row.currency !== 'USD' || typeof row.amount !== 'string') throw new Error('Invalid admin response');
  return decimalToMicros(row.amount, 10_000n);
};

export const createClaudeAdminUsageClient = (fetcher: Fetcher = fetch) => {
  let cache: undefined | { key: string; scope?: string; until: number; value: ClaudeAdminUsage };
  return async (key: string, workspaceId: string | undefined, now: number): Promise<ClaudeAdminUsage> => {
    if (cache && cache.key === key && cache.scope === workspaceId && cache.until > now) return cache.value;
    const { endMs, startMs } = currentUtcMonth(now);
    const common = new URLSearchParams({
      bucket_width: '1d',
      ending_at: new Date(endMs).toISOString(),
      starting_at: new Date(startMs).toISOString()
    });
    common.append('group_by[]', 'workspace_id');
    const [usageBuckets, costBuckets] = await Promise.all([
      pages('usage_report/messages', common, key, fetcher),
      pages('cost_report', common, key, fetcher)
    ]);
    const usageRows = readBucketResults(usageBuckets);
    const costRows = readBucketResults(costBuckets);
    const scope = workspaceId ? 'workspace' : 'organization';
    const title = workspaceId ? 'Workspace API' : 'Org API';
    const value: ClaudeAdminUsage = {
      metric: {
        id: 'month',
        label: `${title} tokens`,
        scope,
        source: 'admin',
        title: 'Month',
        tokens: usageRows.filter((row) => workspaceMatches(row, workspaceId)).reduce((sum, row) => sum + usageTokens(row), 0)
      },
      reportedAt: now,
      spend: {
        amountUsdMicros: costRows.filter((row) => workspaceMatches(row, workspaceId)).reduce((sum, row) => sum + costMicros(row), 0),
        label: workspaceId ? 'Workspace API spend' : 'Org API spend',
        period: 'calendar-month',
        qualifier: 'Does not include Priority Tier cost.',
        scope,
        source: 'admin',
        startsAt: startMs
      }
    };
    cache = { key, scope: workspaceId, until: now + ADMIN_CACHE_MS, value };
    return value;
  };
};

export const getClaudeAdminUsage = createClaudeAdminUsageClient();
