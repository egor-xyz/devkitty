import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (...args: unknown[]) => unknown;
const handlers: Record<string, Handler> = {};
vi.mock('electron', () => ({ ipcMain: { handle: vi.fn((channel: string, handler: Handler) => { handlers[channel] = handler; }) } }));
vi.mock('../libs/claude/accounts', () => ({ detectClaudeCli: vi.fn(), discoverAccounts: vi.fn() }));
vi.mock('../libs/claude/getUsage', () => ({ buildUsage: vi.fn() }));

import { discoverAccounts } from '../libs/claude/accounts';
import { buildUsage } from '../libs/claude/getUsage';

await import('./ipcClaude');

const account = { dir: '/claude', label: 'Claude' };
const local = { account, computedAt: 1, metrics: [{ id: 'five-hour' }] };
describe('Claude usage IPC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(discoverAccounts).mockReturnValue([account]);
    vi.mocked(buildUsage).mockResolvedValue(local as never);
  });

  it('returns only local usage for the discovered account', async () => {
    const result = await handlers['claude:usage']({}, { ...account, email: 'fake@example.test' });
    expect(buildUsage).toHaveBeenCalledWith(account, expect.any(Number));
    expect(result).toEqual(local);
  });

  it.each([null, {}, { ...account, dir: '/forged' }])('rejects an untrusted account %j', async (value) => {
    await expect(handlers['claude:usage']({}, value)).rejects.toThrow();
    expect(buildUsage).not.toHaveBeenCalled();
  });
});
