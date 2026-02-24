import { beforeEach, describe, expect, it, vi } from 'vitest';

const handlers: Record<string, (...args: any[]) => any> = {};

const mockGit = {
  branch: vi.fn(),
  checkout: vi.fn(),
  clean: vi.fn(),
  fetch: vi.fn(),
  merge: vi.fn(),
  pull: vi.fn(),
  push: vi.fn(),
  raw: vi.fn(),
  remote: vi.fn(),
  reset: vi.fn(),
  status: vi.fn()
};

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: any) => {
      handlers[channel] = handler;
    })
  }
}));

vi.mock('../libs/git', () => ({
  getGit: vi.fn(() => Promise.resolve(mockGit)),
  parseWorktreeList: vi.fn(() => [])
}));

import { getGit, parseWorktreeList } from '../libs/git';

await import('./ipcGit');

const mockGetGit = vi.mocked(getGit);
const mockParseWorktreeList = vi.mocked(parseWorktreeList);

describe('ipcGit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGit.mockResolvedValue(mockGit as any);
    mockParseWorktreeList.mockReturnValue([]);
  });

  describe('git:getStatus', () => {
    it('should return git status with branch summary on success', async () => {
      mockGit.status.mockResolvedValue({
        current: 'main',
        files: [],
        isClean: () => true,
        tracking: 'origin/main'
      });
      mockGit.remote.mockResolvedValue('git@github.com:owner/repo.git');
      mockGit.branch.mockResolvedValue({ all: ['main', 'develop'], current: 'main' });
      mockGit.raw.mockResolvedValue('worktree /path\nHEAD abc\nbranch refs/heads/main\n');
      mockGit.fetch.mockResolvedValue(undefined);

      const result = await handlers['git:getStatus']({}, 'proj-1');

      expect(result.success).toBe(true);
      expect(result.status.isClean).toBe(true);
      expect(result.branchSummary).toBeDefined();
      expect(result.organization).toBe('owner');
    });

    it('should return error message on failure', async () => {
      mockGetGit.mockRejectedValueOnce(new Error('Not a git repository'));

      const result = await handlers['git:getStatus']({}, 'proj-1');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Not a git repository');
    });

    it('should handle missing organization gracefully', async () => {
      mockGit.status.mockResolvedValue({
        current: 'main',
        files: [],
        isClean: () => true
      });
      mockGit.remote.mockRejectedValue(new Error('No remote'));
      mockGit.branch.mockResolvedValue({ all: ['main'], current: 'main' });
      mockGit.raw.mockRejectedValue(new Error('worktree not supported'));
      mockGit.fetch.mockResolvedValue(undefined);

      const result = await handlers['git:getStatus']({}, 'proj-1');

      expect(result.success).toBe(true);
      expect(result.organization).toBeUndefined();
    });

    it('should include worktrees when more than one exists', async () => {
      mockGit.status.mockResolvedValue({ current: 'main', files: [], isClean: () => true });
      mockGit.remote.mockResolvedValue('git@github.com:owner/repo.git');
      mockGit.branch.mockResolvedValue({ all: ['main'], current: 'main' });
      mockGit.raw.mockResolvedValue('worktree data');
      mockGit.fetch.mockResolvedValue(undefined);

      mockParseWorktreeList.mockReturnValueOnce([
        { branch: 'main', isMain: true, path: '/path/main' },
        { branch: 'feature', isMain: false, path: '/path/feature' }
      ]);

      const result = await handlers['git:getStatus']({}, 'proj-1');

      expect(result.success).toBe(true);
      expect(result.worktrees).toHaveLength(2);
    });

    it('should not include worktrees when only one exists', async () => {
      mockGit.status.mockResolvedValue({ current: 'main', files: [], isClean: () => true });
      mockGit.remote.mockResolvedValue('git@github.com:owner/repo.git');
      mockGit.branch.mockResolvedValue({ all: ['main'], current: 'main' });
      mockGit.raw.mockResolvedValue('worktree data');
      mockGit.fetch.mockResolvedValue(undefined);

      mockParseWorktreeList.mockReturnValueOnce([{ branch: 'main', isMain: true, path: '/path/main' }]);

      const result = await handlers['git:getStatus']({}, 'proj-1');

      expect(result.success).toBe(true);
      expect(result.worktrees).toBeUndefined();
    });

    it('should delete isClean function from status and replace with boolean', async () => {
      const isCleanFn = () => false;
      mockGit.status.mockResolvedValue({
        current: 'main',
        files: [{ path: 'file.ts' }],
        isClean: isCleanFn
      });
      mockGit.remote.mockRejectedValue(new Error('no remote'));
      mockGit.branch.mockResolvedValue({ all: ['main'], current: 'main' });
      mockGit.raw.mockRejectedValue(new Error('not supported'));
      mockGit.fetch.mockResolvedValue(undefined);

      const result = await handlers['git:getStatus']({}, 'proj-1');

      expect(result.status.isClean).toBe(false);
      expect(typeof result.status.isClean).toBe('boolean');
    });
  });

  describe('git:checkout', () => {
    it('should checkout the specified branch', async () => {
      mockGit.checkout.mockResolvedValue(undefined);

      const result = await handlers['git:checkout']({}, 'proj-1', 'develop');

      expect(result).toEqual({ message: 'Branch checked out', success: true });
      expect(mockGit.checkout).toHaveBeenCalledWith('develop');
    });

    it('should return error on checkout failure', async () => {
      mockGit.checkout.mockRejectedValue(new Error('Branch not found'));

      const result = await handlers['git:checkout']({}, 'proj-1', 'nonexistent');

      expect(result).toEqual({ message: 'Branch not found', success: false });
    });
  });

  describe('git:pull', () => {
    it('should pull successfully', async () => {
      mockGit.pull.mockResolvedValue(undefined);

      const result = await handlers['git:pull']({}, 'proj-1');

      expect(result).toEqual({ message: 'Project pulled', success: true });
    });

    it('should return error on pull failure', async () => {
      mockGit.pull.mockRejectedValue(new Error('Merge conflict'));

      const result = await handlers['git:pull']({}, 'proj-1');

      expect(result).toEqual({ message: 'Merge conflict', success: false });
    });
  });

  describe('git:reset', () => {
    it('should reset to the target branch', async () => {
      mockGit.reset.mockResolvedValue(undefined);
      mockGit.clean.mockResolvedValue(undefined);

      const result = await handlers['git:reset']({}, 'proj-1', 'main', false);

      expect(result).toEqual({ message: 'Project reset', success: true });
      expect(mockGit.reset).toHaveBeenCalledWith('hard', ['origin/main']);
      expect(mockGit.clean).toHaveBeenCalledWith('f');
    });

    it('should force push when force flag is true', async () => {
      mockGit.reset.mockResolvedValue(undefined);
      mockGit.clean.mockResolvedValue(undefined);
      mockGit.push.mockResolvedValue(undefined);

      const result = await handlers['git:reset']({}, 'proj-1', 'main', true);

      expect(result).toEqual({ message: 'Project reset', success: true });
      expect(mockGit.push).toHaveBeenCalledWith(['-f']);
    });

    it('should not force push when force flag is false', async () => {
      mockGit.reset.mockResolvedValue(undefined);
      mockGit.clean.mockResolvedValue(undefined);

      await handlers['git:reset']({}, 'proj-1', 'main', false);

      expect(mockGit.push).not.toHaveBeenCalled();
    });

    it('should return error on reset failure', async () => {
      mockGit.reset.mockRejectedValue(new Error('Reset failed'));

      const result = await handlers['git:reset']({}, 'proj-1', 'main', false);

      expect(result).toEqual({ message: 'Reset failed', success: false });
    });
  });

  describe('git:mergeTo', () => {
    it('should merge from source to target branch', async () => {
      mockGit.checkout.mockResolvedValue(undefined);
      mockGit.pull.mockResolvedValue(undefined);
      mockGit.merge.mockResolvedValue(undefined);
      mockGit.push.mockResolvedValue(undefined);

      const result = await handlers['git:mergeTo']({}, 'proj-1', 'feature', 'main');

      expect(result).toEqual({ message: 'feature merged to main', success: true });
      expect(mockGit.checkout).toHaveBeenCalledWith('main');
      expect(mockGit.pull).toHaveBeenCalled();
      expect(mockGit.merge).toHaveBeenCalledWith(['feature']);
      expect(mockGit.push).toHaveBeenCalled();
      // Should checkout back to source branch
      expect(mockGit.checkout).toHaveBeenCalledWith('feature');
    });

    it('should return merge conflicts when they occur', async () => {
      mockGit.checkout.mockResolvedValue(undefined);
      mockGit.pull.mockResolvedValue(undefined);
      mockGit.merge.mockRejectedValue({
        git: {
          merges: ['file1.ts', 'file2.ts'],
          result: 'CONFLICTS (content): Merge conflict'
        },
        message: 'Merge failed'
      });

      const result = await handlers['git:mergeTo']({}, 'proj-1', 'feature', 'main');

      expect(result.success).toBe(false);
      expect(result.merges).toEqual(['file1.ts', 'file2.ts']);
      expect(result.message).toBe('CONFLICTS (content): Merge conflict');
    });

    it('should return generic error when merge fails without conflicts', async () => {
      mockGit.checkout.mockResolvedValue(undefined);
      mockGit.pull.mockResolvedValue(undefined);
      mockGit.merge.mockRejectedValue(new Error('Network error'));

      const result = await handlers['git:mergeTo']({}, 'proj-1', 'feature', 'main');

      expect(result).toEqual({ message: 'Network error', success: false });
    });

    it('should follow the correct operation order', async () => {
      const callOrder: string[] = [];
      mockGit.checkout.mockImplementation(async (branch) => {
        callOrder.push(`checkout:${branch}`);
      });
      mockGit.pull.mockImplementation(async () => {
        callOrder.push('pull');
      });
      mockGit.merge.mockImplementation(async () => {
        callOrder.push('merge');
      });
      mockGit.push.mockImplementation(async () => {
        callOrder.push('push');
      });

      await handlers['git:mergeTo']({}, 'proj-1', 'feature', 'main');

      expect(callOrder).toEqual(['checkout:main', 'pull', 'merge', 'push', 'checkout:feature']);
    });
  });
});
