import { BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'path';
import { type Worktree } from 'types/worktree';

import { getGit, parseWorktreeList } from '../libs/git';

ipcMain.handle('git:worktree:list', async (_, id: string): Promise<{ message?: string; success: boolean; worktrees?: Worktree[]; }> => {
  try {
    const git = await getGit(id);
    const raw = await git.raw(['worktree', 'list', '--porcelain']);
    const worktrees = parseWorktreeList(raw);

    return { success: true, worktrees };
  } catch (e) {
    return { message: e.message, success: false };
  }
});

ipcMain.handle(
  'git:worktree:add',
  async (_, id: string, repoName: string, branch: string, newBranch?: string) => {
    try {
      const git = await getGit(id);

      const targetBranch = newBranch || branch;

      const win = BrowserWindow.getFocusedWindow();
      const result = await dialog.showOpenDialog(win, {
        buttonLabel: 'Select',
        properties: ['openDirectory', 'createDirectory'],
        title: `Select directory for worktree (${targetBranch})`
      });

      if (result.canceled || !result.filePaths.length) {
        return { message: 'Cancelled', success: false };
      }

      const folderName = `${repoName}-${targetBranch.replace(/\//g, '-')}`;
      const worktreePath = path.join(result.filePaths[0], folderName);

      if (newBranch) {
        // git worktree add -b <new-branch> <path> <start-point>
        await git.raw(['worktree', 'add', '-b', newBranch, worktreePath, branch]);
      } else {
        await git.raw(['worktree', 'add', worktreePath, branch]);
      }

      return { message: `Worktree created at ${worktreePath}`, success: true };
    } catch (e) {
      return { message: e.message, success: false };
    }
  }
);

ipcMain.handle('git:worktree:remove', async (_, id: string, worktreePath: string, force?: boolean) => {
  try {
    const git = await getGit(id);
    const args = ['worktree', 'remove', worktreePath];
    if (force) args.push('--force');
    await git.raw(args);

    return { message: 'Worktree removed', success: true };
  } catch (e) {
    const needsForce = e.message?.includes('contains modified or untracked files');
    return { message: e.message, needsForce, success: false };
  }
});
