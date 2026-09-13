import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (...args: unknown[]) => unknown;
const handlers: Record<string, Handler> = {};
vi.mock('electron', () => ({ ipcMain: { handle: vi.fn((channel: string, handler: Handler) => { handlers[channel] = handler; }) } }));
vi.mock('../libs/aiUsage/secrets', () => ({ aiUsageSecrets: { get: vi.fn() } }));
vi.mock('../libs/claude/accounts', () => ({ detectClaudeCli: vi.fn(), discoverAccounts: vi.fn() }));
vi.mock('../libs/claude/adminUsage', () => ({ getClaudeAdminUsage: vi.fn() }));
vi.mock('../libs/claude/getUsage', () => ({ buildUsage: vi.fn() }));
vi.mock('../settings', () => ({ settings: { get: vi.fn(() => ({ anthropicUsageWorkspaceId: 'ws-1' })) } }));

import { aiUsageSecrets } from '../libs/aiUsage/secrets';
import { discoverAccounts } from '../libs/claude/accounts';
import { getClaudeAdminUsage } from '../libs/claude/adminUsage';
import { buildUsage } from '../libs/claude/getUsage';

await import('./ipcClaude');

const account = { dir: '/claude', label: 'Claude' };
const local = { account, computedAt: 1, metrics: [{ id: 'five-hour' }] };
describe('Claude usage IPC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(discoverAccounts).mockReturnValue([account]);
    vi.mocked(buildUsage).mockResolvedValue(local as never);
    vi.mocked(aiUsageSecrets.get).mockReturnValue('sk-ant-admin-secret');
  });

  it('adds the admin report to local usage', async () => {
    vi.mocked(getClaudeAdminUsage).mockResolvedValue({ metric: { id: 'month' }, spend: { amountUsdMicros: 1 } } as never);
    const result = await handlers['claude:usage']({}, { ...account, email: 'fake@example.test' }) as { metrics: unknown[]; spend: unknown };
    expect(buildUsage).toHaveBeenCalledWith(account, expect.any(Number));
    expect(result.metrics).toEqual([{ id: 'five-hour' }, { id: 'month' }]);
    expect(result.spend).toEqual({ amountUsdMicros: 1 });
  });

  it('keeps local usage when the admin report fails', async () => {
    vi.mocked(getClaudeAdminUsage).mockRejectedValue(new Error('admin failed'));
    await expect(handlers['claude:usage']({}, { dir: '/claude' })).resolves.toEqual(local);
  });

  it.each([null, {}, { ...account, dir: '/forged' }])('rejects an untrusted account %j', async (value) => {
    await expect(handlers['claude:usage']({}, value)).rejects.toThrow();
    expect(buildUsage).not.toHaveBeenCalled();
  });
});
