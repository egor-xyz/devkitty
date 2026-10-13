import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (...args: unknown[]) => unknown;
const handlers: Record<string, Handler> = {};
vi.mock('electron', () => ({ ipcMain: { handle: vi.fn((channel: string, handler: Handler) => { handlers[channel] = handler; }) } }));
vi.mock('../libs/claude/accounts', () => ({ detectClaudeCli: vi.fn(), discoverAccounts: vi.fn() }));
vi.mock('../libs/claude/getUsage', () => ({ buildUsage: vi.fn() }));
vi.mock('../libs/claude/cliUsage', () => ({ readCliUsage: vi.fn() }));

import { discoverAccounts } from '../libs/claude/accounts';
import { readCliUsage } from '../libs/claude/cliUsage';
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

  it('lists only accounts Claude Code reports usage for', async () => {
    const other = { dir: '/claude-b', label: 'claude-b' };
    vi.mocked(discoverAccounts).mockReturnValue([account, other]);
    vi.mocked(readCliUsage).mockImplementation(async (dir) => (dir === account.dir ? { capturedAt: 1 } : null));
    expect(await handlers['claude:accounts']({})).toEqual([account]);
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
