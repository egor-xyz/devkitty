import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('child_process', () => ({
  exec: vi.fn()
}));

import { exec } from 'child_process';
import { execAsync } from './childProcess';

const mockExec = vi.mocked(exec);

describe('childProcess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('execAsync', () => {
    it('should resolve with trimmed stdout on success', async () => {
      mockExec.mockImplementation((command, callback: any) => {
        callback(null, '  some output  \n');
        return {} as any;
      });

      const result = await execAsync('echo hello');

      expect(result).toBe('some output');
    });

    it('should reject with error on failure', async () => {
      const error = new Error('Command failed');
      mockExec.mockImplementation((command, callback: any) => {
        callback(error, '');
        return {} as any;
      });

      await expect(execAsync('bad-command')).rejects.toThrow('Command failed');
    });

    it('should pass the command string to exec', async () => {
      mockExec.mockImplementation((command, callback: any) => {
        callback(null, 'result');
        return {} as any;
      });

      await execAsync('git status');

      expect(mockExec).toHaveBeenCalledWith('git status', expect.any(Function));
    });

    it('should resolve with empty string when stdout is empty', async () => {
      mockExec.mockImplementation((command, callback: any) => {
        callback(null, '');
        return {} as any;
      });

      const result = await execAsync('some-command');

      expect(result).toBe('');
    });
  });
});
