import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('child_process', () => ({
  exec: vi.fn()
}));

import { exec } from 'child_process';
import { getInstalledApps } from './getInstalledApps';

const mockExec = vi.mocked(exec);

describe('getInstalledApps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return list of apps with full paths', async () => {
    mockExec.mockImplementation((command, callback: any) => {
      callback(null, 'Firefox.app\nSafari.app\nChrome.app');
      return {} as any;
    });

    const result = await getInstalledApps('/Applications');

    expect(result).toEqual([
      '/Applications/Firefox.app',
      '/Applications/Safari.app',
      '/Applications/Chrome.app'
    ]);
  });

  it('should return empty array when directory does not exist', async () => {
    mockExec.mockImplementation((command, callback: any) => {
      callback(new Error('No such file or directory'), '');
      return {} as any;
    });

    const result = await getInstalledApps('/nonexistent');

    expect(result).toEqual([]);
  });

  it('should handle empty directory', async () => {
    mockExec.mockImplementation((command, callback: any) => {
      callback(null, '');
      return {} as any;
    });

    const result = await getInstalledApps('/Applications');

    // Empty lines should be filtered out
    expect(result).toEqual([]);
  });

  it('should handle stdout with mixed line endings', async () => {
    mockExec.mockImplementation((command, callback: any) => {
      callback(null, 'App1.app\r\nApp2.app\nApp3.app');
      return {} as any;
    });

    const result = await getInstalledApps('/Applications');

    expect(result).toEqual(['/Applications/App1.app', '/Applications/App2.app', '/Applications/App3.app']);
  });

  it('should prepend directory path to each app', async () => {
    mockExec.mockImplementation((command, callback: any) => {
      callback(null, 'VS Code.app');
      return {} as any;
    });

    const result = await getInstalledApps('/Users/test/Applications');

    expect(result).toEqual(['/Users/test/Applications/VS Code.app']);
  });
});
