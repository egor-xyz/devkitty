import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGit = {
  branch: vi.fn(),
  checkIsRepo: vi.fn(),
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

vi.mock('simple-git', () => ({
  simpleGit: vi.fn(() => mockGit)
}));

vi.mock('../settings', () => ({
  settings: {
    get: vi.fn(),
    set: vi.fn()
  }
}));

import { settings } from '../settings';
import { getGit, getRepoInfo, parseWorktreeList } from './git';

const mockSettings = vi.mocked(settings);

describe('git', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGit.checkIsRepo.mockResolvedValue(true);
  });

  describe('getGit', () => {
    it('should return a git instance for a valid project', async () => {
      mockSettings.get.mockReturnValue([{ filePath: '/path/to/project', id: 'proj-1', name: 'project' }] as any);

      const git = await getGit('proj-1');

      expect(git).toBe(mockGit);
    });

    it('should use the project filePath for simpleGit', async () => {
      const { simpleGit } = await import('simple-git');
      mockSettings.get.mockReturnValue([
        { filePath: '/Users/test/repos/my-app', id: 'proj-1', name: 'my-app' }
      ] as any);

      await getGit('proj-1');

      expect(simpleGit).toHaveBeenCalledWith('/Users/test/repos/my-app');
    });
  });

  describe('parseWorktreeList', () => {
    it('should parse a single worktree (main)', () => {
      const output = `worktree /path/to/main
HEAD abc1234
branch refs/heads/main

`;

      const result = parseWorktreeList(output);

      expect(result).toEqual([{ branch: 'main', isMain: true, path: '/path/to/main' }]);
    });

    it('should parse multiple worktrees', () => {
      const output = `worktree /path/to/main
HEAD abc1234
branch refs/heads/main

worktree /path/to/feature
HEAD def5678
branch refs/heads/feature/my-feature

`;

      const result = parseWorktreeList(output);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ branch: 'main', isMain: true, path: '/path/to/main' });
      expect(result[1]).toEqual({
        branch: 'feature/my-feature',
        isMain: false,
        path: '/path/to/feature'
      });
    });

    it('should handle detached worktrees', () => {
      const output = `worktree /path/to/main
HEAD abc1234
branch refs/heads/main

worktree /path/to/detached
HEAD 9999999
detached

`;

      const result = parseWorktreeList(output);

      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({
        branch: '(detached)',
        isMain: false,
        path: '/path/to/detached'
      });
    });

    it('should skip bare worktrees', () => {
      const output = `worktree /path/to/bare
HEAD abc1234
bare

worktree /path/to/main
HEAD def5678
branch refs/heads/main

`;

      const result = parseWorktreeList(output);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ branch: 'main', isMain: true, path: '/path/to/main' });
    });

    it('should return empty array for empty input', () => {
      const result = parseWorktreeList('');

      expect(result).toEqual([]);
    });

    it('should strip refs/heads/ prefix from branch names', () => {
      const output = `worktree /path/to/main
HEAD abc1234
branch refs/heads/develop

`;

      const result = parseWorktreeList(output);

      expect(result[0].branch).toBe('develop');
    });

    it('should mark only the first non-bare worktree as main', () => {
      const output = `worktree /path/to/main
HEAD abc1234
branch refs/heads/main

worktree /path/to/feature1
HEAD def5678
branch refs/heads/feature1

worktree /path/to/feature2
HEAD ghi9012
branch refs/heads/feature2

`;

      const result = parseWorktreeList(output);

      expect(result[0].isMain).toBe(true);
      expect(result[1].isMain).toBe(false);
      expect(result[2].isMain).toBe(false);
    });
  });

  describe('getRepoInfo', () => {
    it('should parse owner and repo from SSH remote URL', async () => {
      mockSettings.get.mockReturnValue([{ filePath: '/path/to/project', id: 'proj-1', name: 'project' }] as any);
      mockGit.remote.mockResolvedValue('git@github.com:egor-xyz/devkitty.git');

      const result = await getRepoInfo('proj-1');

      expect(result).toEqual({ owner: 'egor-xyz', repo: 'devkitty' });
    });

    it('should return empty object when remote fails', async () => {
      mockSettings.get.mockReturnValue([{ filePath: '/path/to/project', id: 'proj-1', name: 'project' }] as any);
      mockGit.remote.mockRejectedValue(new Error('No remote'));

      const result = await getRepoInfo('proj-1');

      expect(result).toEqual({});
    });

    it('should return empty object when no remote URL is returned', async () => {
      mockSettings.get.mockReturnValue([{ filePath: '/path/to/project', id: 'proj-1', name: 'project' }] as any);
      mockGit.remote.mockResolvedValue(null);

      const result = await getRepoInfo('proj-1');

      expect(result).toEqual({});
    });

    it('should call git.remote with correct arguments', async () => {
      mockSettings.get.mockReturnValue([{ filePath: '/path/to/project', id: 'proj-1', name: 'project' }] as any);
      mockGit.remote.mockResolvedValue('git@github.com:owner/repo.git');

      await getRepoInfo('proj-1');

      expect(mockGit.remote).toHaveBeenCalledWith(['get-url', 'origin']);
    });
  });
});
