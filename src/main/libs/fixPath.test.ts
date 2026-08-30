import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('child_process', () => ({
  execSync: vi.fn()
}));

import { execSync } from 'child_process';

import { fixPath } from './fixPath';

const mockExecSync = vi.mocked(execSync);

describe('fixPath', () => {
  const originalPlatform = process.platform;
  const originalShell = process.env.SHELL;
  const originalPath = process.env.PATH;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    process.env.SHELL = originalShell;
    process.env.PATH = originalPath;
  });

  it('should return early without calling execSync on non-darwin platforms', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    process.env.PATH = '/usr/bin:/bin';

    fixPath();

    expect(mockExecSync).not.toHaveBeenCalled();
    expect(process.env.PATH).toBe('/usr/bin:/bin');
  });

  it('should set process.env.PATH to the shell-reported PATH on darwin', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    process.env.SHELL = '/bin/zsh';
    process.env.PATH = '/usr/bin:/bin';
    mockExecSync.mockReturnValue('/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin' as any);

    fixPath();

    expect(mockExecSync).toHaveBeenCalledWith(
      "/bin/zsh -ilc 'echo -n $PATH'",
      expect.objectContaining({ encoding: 'utf8', timeout: 5000 })
    );
    expect(process.env.PATH).toBe('/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin');
  });

  it('should fall back to /bin/zsh when SHELL is not set', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    delete process.env.SHELL;
    process.env.PATH = '/usr/bin:/bin';
    mockExecSync.mockReturnValue('/usr/bin:/bin' as any);

    fixPath();

    expect(mockExecSync).toHaveBeenCalledWith(
      "/bin/zsh -ilc 'echo -n $PATH'",
      expect.objectContaining({ encoding: 'utf8', timeout: 5000 })
    );
  });

  it('should not overwrite PATH when execSync returns an empty string', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    process.env.PATH = '/usr/bin:/bin';
    mockExecSync.mockReturnValue('' as any);

    fixPath();

    expect(process.env.PATH).toBe('/usr/bin:/bin');
  });

  it('should append missing common macOS paths when execSync throws', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    process.env.PATH = '/usr/bin:/bin';
    mockExecSync.mockImplementation(() => {
      throw new Error('command failed');
    });

    fixPath();

    expect(process.env.PATH).toBe('/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin:/opt/homebrew/sbin');
  });

  it('should not duplicate common macOS paths that are already present when execSync throws', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    process.env.PATH = '/usr/bin:/bin:/opt/homebrew/bin';
    mockExecSync.mockImplementation(() => {
      throw new Error('command failed');
    });

    fixPath();

    expect(process.env.PATH).toBe('/usr/bin:/bin:/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/sbin');
  });
});
