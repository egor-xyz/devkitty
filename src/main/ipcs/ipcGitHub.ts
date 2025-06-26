import { ipcMain, safeStorage } from 'electron';
import log from 'electron-log';
import { Octokit } from 'octokit';
import { type PullType } from 'types/gitHub';

import { getRepoInfo } from '../libs/git';
import { settings } from '../settings';

const protectedBranches = ['master', 'main'];

const octokit = () => {
  const { gitHubToken } = settings.get('appSettings');
  if (!gitHubToken) throw new Error('GitHub token not found');

  const token = safeStorage.decryptString(Buffer.from(gitHubToken));
  if (!token) throw new Error('GitHub token not found');

  return new Octokit({ auth: token });
};

ipcMain.handle('git:api:reset', async (_, id: string, origin: string, target: string) => {
  try {
    if (protectedBranches.includes(origin)) throw new Error(`Branch ${origin} is forbidden to reset`);

    const { gitHubToken } = settings.get('appSettings');
    if (!gitHubToken) throw new Error('GitHub token not found');

    const token = safeStorage.decryptString(Buffer.from(gitHubToken));
    if (!token) throw new Error('GitHub token not found');

    const { owner, repo } = await getRepoInfo(id);
    if (!owner || !repo) throw new Error('Project not found');

    const targetData = await octokit().rest.git.getRef({
      owner,
      ref: `heads/${target}`,
      repo
    });

    const sha = targetData.data?.object?.sha;
    if (!sha) throw new Error('Target branch not found');

    octokit().rest.git.updateRef({
      force: true,
      owner,
      ref: `heads/${origin}`,
      repo,
      sha
    });

    return { message: `Branch ${origin} was reset to ${target}`, success: true };
  } catch (e) {
    log.error(e);
    return { message: e.message, success: false };
  }
});

ipcMain.handle('git:api:getAction', async (_, id: string, filterBy: string[]) => {
  try {
    const { gitHubActions } = settings.get('appSettings');
    const { all, count, inProgress } = gitHubActions;

    const { owner, repo } = await getRepoInfo(id);
    if (!owner || !repo) throw new Error('Project not found');

    const { data } = await octokit().rest.actions.listWorkflowRunsForRepo({
      owner,
      repo
    });

    if (data.total_count < 1) {
      return { message: 'No running actions', success: true };
    }

    const runs = data.workflow_runs
      .filter((run) => all || filterBy.includes(run.head_branch))
      .filter((run) => new Date(run.created_at).getTime() > Date.now() - 86400000)
      .filter(
        (run) =>
          !inProgress || run.status === 'in_progress' || new Date(run.created_at).getTime() > Date.now() - 1800000
      );

    if (runs.length < 1) {
      return { message: 'No actions for this branch', success: false };
    }

    return { runs: runs.slice(0, count), success: true };
  } catch (e) {
    log.error(e);
    return { message: e.message, success: false };
  }
});

ipcMain.handle('git:api:getPulls', async (_, id: string, pullType: PullType) => {
  try {
    const { owner, repo } = await getRepoInfo(id);
    if (!owner || !repo) throw new Error('Project not found');

    const { data } = await octokit().rest.search.issuesAndPullRequests({
      q: `repo:${owner}/${repo} is:open is:pr ${pullType}:@me archived:false`
    });

    return { pulls: data?.items, success: true };
  } catch (e) {
    log.error(e);
    return { message: e.message, success: false };
  }
});
