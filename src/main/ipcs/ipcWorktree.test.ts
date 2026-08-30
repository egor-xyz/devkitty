import { beforeEach, describe, expect, it, vi } from 'vitest';

const handlers: Record<string, (...args: any[]) => any> = {};

const mockGit = {
  pull: vi.fn(),
  raw: vi.fn(),
  revparse: vi.fn(),
  status: vi.fn()
};

vi.mock('electron', () => ({
  BrowserWindow: {
    getFocusedWindow: vi.fn(() => ({}))
  },
  dialog: {
    showOpenDialog: vi.fn()
  },
  ipcMain: {
    handle: vi.fn((channel: string, handler: any) => {
      handlers[channel] = handler;
    })
  }
}));

vi.mock('fs/promises', () => ({
  copyFile: vi.fn()
}));

vi.mock('path', () => ({
  default: {
    join: (...args: string[]) => args.join('/')
  }
}));

vi.mock('simple-git', () => ({
  simpleGit: vi.fn(() => mockGit)
}));

vi.mock('../libs/git', () => ({
  getGit: vi.fn(() => Promise.resolve(mockGit)),
  getWorktreeGit: vi.fn(() => Promise.resolve(mockGit)),
  parseWorktreeList: vi.fn()
}));

import { dialog } from 'electron';
import { copyFile } from 'fs/promises';

import { getGit, getWorktreeGit, parseWorktreeList } from '../libs/git';

await import('./ipcWorktree');

const mockGetGit = vi.mocked(getGit);
const mockGetWorktreeGit = vi.mocked(getWorktreeGit);
const mockParseWorktreeList = vi.mocked(parseWorktreeList);
const mockDialog = vi.mocked(dialog);
const mockCopyFile = vi.mocked(copyFile);

describe('ipcWorktree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGit.mockResolvedValue(mockGit as any);
    mockGetWorktreeGit.mockResolvedValue(mockGit as any);
  });

  describe('git:worktree:list', () => {
    it('should return parsed worktree list', async () => {
      const worktrees = [
        { branch: 'main', isMain: true, path: '/path/main' },
        { branch: 'feature', isMain: false, path: '/path/feature' }
      ];
      mockGit.raw.mockResolvedValue('worktree output');
      mockParseWorktreeList.mockReturnValue(worktrees);

      const result = await handlers['git:worktree:list']({}, 'proj-1');

      expect(result).toEqual({ success: true, worktrees });
      expect(mockGit.raw).toHaveBeenCalledWith(['worktree', 'list', '--porcelain']);
    });

    it('should return error on failure', async () => {
      mockGetGit.mockRejectedValueOnce(new Error('Git failed'));

      const result = await handlers['git:worktree:list']({}, 'proj-1');

      expect(result).toEqual({ message: 'Git failed', success: false });
    });
  });

  describe('git:worktree:add', () => {
    it('should add worktree to selected directory for existing branch', async () => {
      mockDialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/Users/test/worktrees']
      });
      mockGit.raw.mockResolvedValue(undefined);

      const result = await handlers['git:worktree:add']({}, 'proj-1', 'my-repo', 'feature');

      expect(result).toEqual({ message: 'Worktree created at /Users/test/worktrees/my-repo-feature', success: true });
      expect(mockGit.raw).toHaveBeenCalledWith([
        'worktree',
        'add',
        '/Users/test/worktrees/my-repo-feature',
        'feature'
      ]);
    });

    it('should create new branch when newBranch is provided', async () => {
      mockDialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/Users/test/worktrees']
      });
      mockGit.raw.mockResolvedValue(undefined);

      const result = await handlers['git:worktree:add']({}, 'proj-1', 'my-repo', 'main', 'new-feature');

      expect(mockGit.raw).toHaveBeenCalledWith([
        'worktree',
        'add',
        '-b',
        'new-feature',
        '/Users/test/worktrees/my-repo-new-feature',
        'main'
      ]);
      expect(result.success).toBe(true);
    });

    it('should return cancelled when dialog is dismissed', async () => {
      mockDialog.showOpenDialog.mockResolvedValue({
        canceled: true,
        filePaths: []
      });

      const result = await handlers['git:worktree:add']({}, 'proj-1', 'my-repo', 'feature');

      expect(result).toEqual({ message: 'Cancelled', success: false });
    });

    it('should replace slashes in branch name for folder name', async () => {
      mockDialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/Users/test/worktrees']
      });
      mockGit.raw.mockResolvedValue(undefined);

      await handlers['git:worktree:add']({}, 'proj-1', 'my-repo', 'feature/sub/branch');

      expect(mockGit.raw).toHaveBeenCalledWith([
        'worktree',
        'add',
        '/Users/test/worktrees/my-repo-feature-sub-branch',
        'feature/sub/branch'
      ]);
    });

    it('should return error on git failure', async () => {
      mockDialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/Users/test/worktrees']
      });
      mockGit.raw.mockRejectedValue(new Error('Branch already exists'));

      const result = await handlers['git:worktree:add']({}, 'proj-1', 'my-repo', 'feature');

      expect(result).toEqual({ message: 'Branch already exists', success: false });
    });

    it('should copy the .env.local file from the repository root into the new worktree when copyEnvLocal is true', async () => {
      mockDialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/Users/test/worktrees']
      });
      mockGit.raw.mockResolvedValue(undefined);
      mockGit.revparse.mockResolvedValue('/Users/test/repo\n');
      mockCopyFile.mockResolvedValue(undefined);

      const result = await handlers['git:worktree:add']({}, 'proj-1', 'my-repo', 'feature', undefined, true);

      expect(mockGit.revparse).toHaveBeenCalledWith(['--show-toplevel']);
      expect(mockCopyFile).toHaveBeenCalledWith(
        '/Users/test/repo/.env.local',
        '/Users/test/worktrees/my-repo-feature/.env.local'
      );
      expect(result).toEqual({ message: 'Worktree created at /Users/test/worktrees/my-repo-feature', success: true });
    });

    it('should still report success when copyEnvLocal is true but no .env.local file exists to copy', async () => {
      mockDialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/Users/test/worktrees']
      });
      mockGit.raw.mockResolvedValue(undefined);
      mockGit.revparse.mockResolvedValue('/Users/test/repo');
      mockCopyFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const result = await handlers['git:worktree:add']({}, 'proj-1', 'my-repo', 'feature', undefined, true);

      expect(result).toEqual({ message: 'Worktree created at /Users/test/worktrees/my-repo-feature', success: true });
    });

    it('should not attempt to copy .env.local when copyEnvLocal is falsy', async () => {
      mockDialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/Users/test/worktrees']
      });
      mockGit.raw.mockResolvedValue(undefined);

      await handlers['git:worktree:add']({}, 'proj-1', 'my-repo', 'feature');

      expect(mockGit.revparse).not.toHaveBeenCalled();
      expect(mockCopyFile).not.toHaveBeenCalled();
    });
  });

  describe('git:worktree:status', () => {
    it('should return the worktree status with isClean resolved to a plain boolean value', async () => {
      const isCleanFn = vi.fn(() => true);
      mockGit.status.mockResolvedValue({ isClean: isCleanFn, modified: ['file.txt'], not_added: [] });

      const result = await handlers['git:worktree:status']({}, '/path/to/worktree');

      expect(mockGit.status).toHaveBeenCalled();
      expect(isCleanFn).toHaveBeenCalled();
      expect(result).toEqual({
        status: { isClean: true, modified: ['file.txt'], not_added: [] },
        success: true
      });
    });

    it('should return an error message when retrieving the worktree status fails', async () => {
      mockGit.status.mockRejectedValue(new Error('Not a git repository'));

      const result = await handlers['git:worktree:status']({}, '/path/to/worktree');

      expect(result).toEqual({ message: 'Not a git repository', success: false });
    });
  });

  describe('git:worktree:remove', () => {
    it('should remove worktree at the given path', async () => {
      mockGit.raw.mockResolvedValue(undefined);

      const result = await handlers['git:worktree:remove']({}, 'proj-1', '/path/to/worktree');

      expect(result).toEqual({ message: 'Worktree removed', success: true });
      expect(mockGit.raw).toHaveBeenCalledWith(['worktree', 'remove', '/path/to/worktree']);
    });

    it('should add --force flag when force is true', async () => {
      mockGit.raw.mockResolvedValue(undefined);

      await handlers['git:worktree:remove']({}, 'proj-1', '/path/to/worktree', true);

      expect(mockGit.raw).toHaveBeenCalledWith(['worktree', 'remove', '/path/to/worktree', '--force']);
    });

    it('should not add --force flag when force is false', async () => {
      mockGit.raw.mockResolvedValue(undefined);

      await handlers['git:worktree:remove']({}, 'proj-1', '/path/to/worktree', false);

      expect(mockGit.raw).toHaveBeenCalledWith(['worktree', 'remove', '/path/to/worktree']);
    });

    it('should indicate needsForce when worktree has modified files', async () => {
      mockGit.raw.mockRejectedValue(new Error('contains modified or untracked files, use --force'));

      const result = await handlers['git:worktree:remove']({}, 'proj-1', '/path/to/worktree');

      expect(result.success).toBe(false);
      expect(result.needsForce).toBe(true);
    });

    it('should not indicate needsForce for other errors', async () => {
      mockGit.raw.mockRejectedValue(new Error('Some other error'));

      const result = await handlers['git:worktree:remove']({}, 'proj-1', '/path/to/worktree');

      expect(result.success).toBe(false);
      expect(result.needsForce).toBe(false);
    });
  });

  describe('git:worktree:pull', () => {
    it('should pull using a git instance bound to the worktree path', async () => {
      mockGit.pull.mockResolvedValue(undefined);

      const result = await handlers['git:worktree:pull']({}, 'proj-1', '/path/to/feature');

      expect(mockGetWorktreeGit).toHaveBeenCalledWith('proj-1', '/path/to/feature');
      expect(mockGit.pull).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Worktree pulled', success: true });
    });

    it('should return the error message on failure', async () => {
      mockGetWorktreeGit.mockRejectedValueOnce(new Error('Worktree not found for this project'));

      const result = await handlers['git:worktree:pull']({}, 'proj-1', '/nope');

      expect(result).toEqual({ message: 'Worktree not found for this project', success: false });
    });
  });
});
