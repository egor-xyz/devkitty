import { ipcMain } from 'electron';
import { CleanOptions, ResetMode } from 'simple-git';
import { type GitStatus } from 'types/project';

import { getGit, parseWorktreeList } from '../libs/git';

ipcMain.handle('git:getStatus', async (_, id: string): Promise<GitStatus> => {
  try {
    const git = await getGit(id);

    // Get current branch status
    const status = await git.status();
    const isClean = status.isClean();
    delete status.isClean;
    const gitStatus = { ...status, isClean };

    // Get organization
    let organization: string;
    try {
      const origin = await git.remote(['get-url', 'origin']);
      organization = origin ? origin.split(':')[1].split('/')[0] : undefined;
    } catch {
      /* empty */
    }

    const branchSummary = await git.branch();

    // Get worktrees
    let worktrees;
    try {
      const raw = await git.raw(['worktree', 'list', '--porcelain']);
      const parsed = parseWorktreeList(raw);
      if (parsed.length > 1) {
        worktrees = parsed;
      }
    } catch {
      /* worktree list not supported or failed */
    }

    git.fetch();

    return { branchSummary, organization, status: gitStatus, success: true, worktrees };
  } catch (e) {
    return { message: e.message, success: false };
  }
});

ipcMain.handle('git:checkout', async (e, id: string, branch: string) => {
  try {
    const git = await getGit(id);

    await git.checkout(branch);

    return { message: 'Branch checked out', success: true };
  } catch (e) {
    return { message: e.message, success: false };
  }
});

ipcMain.handle('git:pull', async (e, id: string) => {
  try {
    const git = await getGit(id);

    await git.pull();

    return { message: 'Project pulled', success: true };
  } catch (e) {
    return { message: e.message, success: false };
  }
});

ipcMain.handle('git:reset', async (_, id: string, target, force) => {
  try {
    const git = await getGit(id);

    await git.reset(ResetMode.HARD, [`origin/${target}`]);

    await git.clean(CleanOptions.FORCE);

    if (force) {
      await git.push(['-f']);
    }

    return { message: 'Project reset', success: true };
  } catch (e) {
    return { message: e.message, success: false };
  }
});

ipcMain.handle('git:mergeTo', async (e, id: string, from: string, target: string) => {
  try {
    const git = await getGit(id);

    await git.checkout(target);
    await git.pull();
    await git.merge([from]);
    await git.push();
    await git.checkout(from);

    return { message: `${from} merged to ${target}`, success: true };
  } catch (e) {
    // files conflict found
    if (e.git?.merges?.length && e.git.result) {
      return { merges: e.git.merges, message: e.git.result, success: false };
    }

    return { message: e.message, success: false };
  }
});
