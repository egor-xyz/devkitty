import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (...args: unknown[]) => unknown;
const handlers: Record<string, Handler> = {};
vi.mock('electron', () => ({ ipcMain: { handle: vi.fn((channel: string, handler: Handler) => { handlers[channel] = handler; }) } }));
vi.mock('../libs/codex/accounts', () => ({ detectCodexCli: vi.fn(), discoverAccounts: vi.fn() }));
vi.mock('../libs/codex/getUsage', () => ({ buildUsage: vi.fn() }));

import { discoverAccounts } from '../libs/codex/accounts';
import { buildUsage } from '../libs/codex/getUsage';

await import('./ipcCodex');

const account = { dir: '/codex', label: 'Codex', provider: 'codex' as const };
const local = { account, computedAt: 1, metrics: [{ id: 'five-hour' }] };
describe('Codex usage IPC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(discoverAccounts).mockReturnValue([account]);
    vi.mocked(buildUsage).mockResolvedValue(local as never);
  });

  it('returns only local usage for the discovered account', async () => {
    await expect(handlers['codex:usage']({}, account)).resolves.toEqual(local);
    expect(buildUsage).toHaveBeenCalledWith(account, expect.any(Number));
  });

  it.each([null, {}, { ...account, provider: 'cursor' }, { ...account, dir: '/forged' }])('rejects an untrusted account %j', async (value) => {
    await expect(handlers['codex:usage']({}, value)).rejects.toThrow();
    expect(buildUsage).not.toHaveBeenCalled();
  });
});
