import { ipcMain } from 'electron';
import { CleanOptions, ResetMode } from 'simple-git';
import { type GitStatus } from 'types/project';
import { type Worktree } from 'types/worktree';

import { getGit, parseWorktreeList } from '../libs/git';

// Serialize network git ops (fetch/pull) per repo. getGit() builds a fresh
// simple-git instance per IPC call, so two handlers — the polled status fetch
// and a Pull click, say — otherwise spawn concurrent `git` processes on the
// same repo. Concurrent fetches scramble .git/FETCH_HEAD, which makes the very
// next pull fail with "Cannot fast-forward to multiple branches". Chaining
// every fetch/pull per repo id keeps them one-at-a-time. Errors are swallowed
// in the chain so one failed op never blocks the next.
const repoLocks = new Map<string, Promise<unknown>>();

const withRepoLock = <T>(id: string, task: () => Promise<T>): Promise<T> => {
  const run = (repoLocks.get(id) ?? Promise.resolve()).then(task, task);
  repoLocks.set(
    id,
    run.then(
      () => undefined,
      () => undefined
    )
  );

  return run;
};

// The status poll runs every 10 s per project, but remote refs do not need to
// be that fresh: fetch in the background at most once per 5 minutes per repo.
// A Pull still fetches by itself.
const FETCH_EVERY_MS = 5 * 60_000;
const lastFetchAt = new Map<string, number>();

export const __resetFetchThrottle = (): void => lastFetchAt.clear();

ipcMain.handle('git:getStatus', async (_, id: string, force?: boolean): Promise<GitStatus> => {
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
    let worktrees: Worktree[];
    try {
      const raw = await git.raw(['worktree', 'list', '--porcelain']);
      worktrees = parseWorktreeList(raw);
    } catch {
      /* worktree list not supported or failed */
    }

    // Fire-and-forget, throttled per repo, and serialized against any pull on
    // this repo. The timestamp is set first so concurrent polls do not double-fetch.
    // `force` (the Refresh button) skips the throttle but still records the fetch.
    const now = Date.now();
    if (force || now - (lastFetchAt.get(id) ?? 0) >= FETCH_EVERY_MS) {
      lastFetchAt.set(id, now);
      withRepoLock(id, () => git.fetch());
    }

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

    // --ff-only, so a repo with no pull.rebase configured does not fail with
    // git's "need to specify how to reconcile divergent branches", and a button
    // press never rewrites or merges history behind the user's back. Locked so
    // it never runs while a background status fetch is in flight.
    await withRepoLock(id, () => git.pull(['--ff-only']));

    return { message: 'Project pulled', success: true };
  } catch (e) {
    const diverged =
      e.message?.includes('Not possible to fast-forward') ||
      e.message?.includes('not possible to fast-forward') ||
      e.message?.includes('divergent branches');

    return {
      message: diverged ? 'Local commits diverge from the remote — rebase or merge manually' : e.message,
      success: false
    };
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
    await withRepoLock(id, () => git.pull());
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
