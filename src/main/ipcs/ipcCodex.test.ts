import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (...args: unknown[]) => unknown;
const handlers: Record<string, Handler> = {};
vi.mock('electron', () => ({ ipcMain: { handle: vi.fn((channel: string, handler: Handler) => { handlers[channel] = handler; }) } }));
vi.mock('../libs/codex/accounts', () => ({ detectCodexCli: vi.fn(), discoverAccounts: vi.fn() }));
vi.mock('../libs/codex/getUsage', () => ({ buildUsage: vi.fn() }));

import { detectCodexCli, discoverAccounts } from '../libs/codex/accounts';
import { buildUsage } from '../libs/codex/getUsage';

await import('./ipcCodex');

const account = { dir: '/home/.codex', label: 'codex', provider: 'codex' as const };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(discoverAccounts).mockReturnValue([account]); });

describe('Codex IPC', () => {
  it('delegates discovery and CLI detection', () => {
    handlers['codex:detect']({});
    expect(detectCodexCli).toHaveBeenCalledOnce();
    expect(handlers['codex:accounts']({})).toEqual([account]);
  });

  it('reads only rediscovered profile and discards caller-supplied display metadata', () => {
    handlers['codex:usage']({}, { ...account, email: 'untrusted@example.test' });
    expect(buildUsage).toHaveBeenCalledWith(account, expect.any(Number));
  });

  it.each([null, {}, { ...account, provider: 'claude' }, { ...account, dir: '/arbitrary/private' }])('rejects invalid profile %j', (value) => {
    expect(() => handlers['codex:usage']({}, value)).toThrow();
    expect(buildUsage).not.toHaveBeenCalled();
  });
});
