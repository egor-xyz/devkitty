import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (...args: unknown[]) => unknown;
const handlers: Record<string, Handler> = {};
vi.mock('electron', () => ({ ipcMain: { handle: vi.fn((channel: string, handler: Handler) => { handlers[channel] = handler; }) } }));
vi.mock('../libs/cursor/accounts', () => ({ detectCursor: vi.fn(), discoverAccounts: vi.fn() }));
vi.mock('../libs/cursor/getUsage', () => ({ buildUsage: vi.fn() }));

import { detectCursor, discoverAccounts } from '../libs/cursor/accounts';
import { buildUsage } from '../libs/cursor/getUsage';

await import('./ipcCursor');

const account = { dir: '/trusted/cursor', label: 'cursor', provider: 'cursor' as const };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(discoverAccounts).mockReturnValue([account]);
});

describe('Cursor IPC', () => {
  it('delegates detection and discovery', () => {
    handlers['cursor:detect']({});
    expect(detectCursor).toHaveBeenCalledOnce();
    expect(handlers['cursor:accounts']({})).toEqual([account]);
  });

  it('uses the rediscovered account and drops caller display data', () => {
    handlers['cursor:usage']({}, { ...account, email: 'forged@example.test' });
    expect(buildUsage).toHaveBeenCalledWith(account, expect.any(Number));
  });

  it.each([null, {}, { ...account, provider: 'codex' }, { ...account, dir: '/forged' }])('rejects an untrusted account %j', (value) => {
    expect(() => handlers['cursor:usage']({}, value)).toThrow();
    expect(buildUsage).not.toHaveBeenCalled();
  });
});
