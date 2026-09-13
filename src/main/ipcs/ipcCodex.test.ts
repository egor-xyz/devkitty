import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (...args: unknown[]) => unknown;
const handlers: Record<string, Handler> = {};
vi.mock('electron', () => ({ ipcMain: { handle: vi.fn((channel: string, handler: Handler) => { handlers[channel] = handler; }) } }));
vi.mock('../libs/aiUsage/secrets', () => ({ aiUsageSecrets: { get: vi.fn() } }));
vi.mock('../libs/codex/accounts', () => ({ detectCodexCli: vi.fn(), discoverAccounts: vi.fn() }));
vi.mock('../libs/codex/adminUsage', () => ({ getCodexAdminUsage: vi.fn() }));
vi.mock('../libs/codex/getUsage', () => ({ buildUsage: vi.fn() }));
vi.mock('../settings', () => ({ settings: { get: vi.fn(() => ({ openAIUsageProjectId: 'proj-1' })) } }));

import { aiUsageSecrets } from '../libs/aiUsage/secrets';
import { discoverAccounts } from '../libs/codex/accounts';
import { getCodexAdminUsage } from '../libs/codex/adminUsage';
import { buildUsage } from '../libs/codex/getUsage';

await import('./ipcCodex');

const account = { dir: '/codex', label: 'Codex', provider: 'codex' as const };
const local = { account, computedAt: 1, metrics: [{ id: 'five-hour' }] };
describe('Codex usage IPC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(discoverAccounts).mockReturnValue([account]);
    vi.mocked(buildUsage).mockResolvedValue(local as never);
    vi.mocked(aiUsageSecrets.get).mockReturnValue('sk-admin-secret');
  });

  it('adds the admin report to local usage', async () => {
    vi.mocked(getCodexAdminUsage).mockResolvedValue({ metric: { id: 'month' }, spend: { amountUsdMicros: 2 } } as never);
    const result = await handlers['codex:usage']({}, account) as { metrics: unknown[]; spend: unknown };
    expect(result.metrics).toEqual([{ id: 'five-hour' }, { id: 'month' }]);
    expect(result.spend).toEqual({ amountUsdMicros: 2 });
  });

  it('keeps local usage when the admin report fails', async () => {
    vi.mocked(getCodexAdminUsage).mockRejectedValue(new Error('admin failed'));
    await expect(handlers['codex:usage']({}, account)).resolves.toEqual(local);
  });
});
