import { beforeEach, describe, expect, it, vi } from 'vitest';

const handlers: Record<string, (...args: any[]) => any> = {};

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: any) => {
      handlers[channel] = handler;
    })
  }
}));

vi.mock('../libs/claude/accounts', () => ({
  detectClaudeCli: vi.fn(),
  discoverAccounts: vi.fn()
}));

vi.mock('../libs/claude/getUsage', () => ({
  buildUsage: vi.fn()
}));

import { detectClaudeCli, discoverAccounts } from '../libs/claude/accounts';
import { buildUsage } from '../libs/claude/getUsage';

await import('./ipcClaude');

const mockDetect = vi.mocked(detectClaudeCli);
const mockAccounts = vi.mocked(discoverAccounts);
const mockBuildUsage = vi.mocked(buildUsage);

describe('ipcClaude', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('claude:detect delegates to detectClaudeCli', () => {
    mockDetect.mockReturnValue(Promise.resolve({ installed: true, version: '2.1.0' }));
    handlers['claude:detect']({});
    expect(mockDetect).toHaveBeenCalledOnce();
  });

  it('claude:accounts delegates to discoverAccounts', () => {
    mockAccounts.mockReturnValue([{ dir: '/home/.claude', label: 'claude' }]);
    const res = handlers['claude:accounts']({});
    expect(mockAccounts).toHaveBeenCalledOnce();
    expect(res).toEqual([{ dir: '/home/.claude', label: 'claude' }]);
  });

  it('claude:usage builds usage for the given account with a current timestamp', () => {
    const account = { dir: '/home/.claude', label: 'claude' };
    handlers['claude:usage']({}, account);
    expect(mockBuildUsage).toHaveBeenCalledOnce();
    expect(mockBuildUsage.mock.calls[0][0]).toBe(account);
    expect(typeof mockBuildUsage.mock.calls[0][1]).toBe('number');
  });
});
