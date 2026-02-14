import { describe, it, expect, vi } from 'vitest';

vi.mock('fs/promises', () => ({
  access: vi.fn()
}));

import { access } from 'fs/promises';
import { pathExists } from './path-exists';

const mockAccess = vi.mocked(access);

describe('pathExists', () => {
  it('should return true when the path exists', async () => {
    mockAccess.mockResolvedValueOnce(undefined);

    const result = await pathExists('/some/existing/path');

    expect(result).toBe(true);
    expect(mockAccess).toHaveBeenCalledWith('/some/existing/path');
  });

  it('should return false when the path does not exist', async () => {
    mockAccess.mockRejectedValueOnce(new Error('ENOENT'));

    const result = await pathExists('/some/nonexistent/path');

    expect(result).toBe(false);
    expect(mockAccess).toHaveBeenCalledWith('/some/nonexistent/path');
  });

  it('should return false on permission error', async () => {
    mockAccess.mockRejectedValueOnce(new Error('EACCES'));

    const result = await pathExists('/some/protected/path');

    expect(result).toBe(false);
  });
});
