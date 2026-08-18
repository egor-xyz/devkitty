import { ipcMain, safeStorage } from 'electron';
import log from 'electron-log';
import { Octokit } from 'octokit';
import { type PullType, type Run } from 'types/gitHub';

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

// A busy repo produces more than 100 runs an hour, so a single page covers
// barely the last few minutes and older branches come back empty. A deep fetch
// walks pages until it reaches runs older than the 24h window it would filter
// out anyway; polls stay on one page and merge into what the renderer already
// holds.
const maxPages = 5;

ipcMain.handle('git:api:getRuns', async (_, id: string, deep = false) => {
  try {
    const { owner, repo } = await getRepoInfo(id);
    if (!owner || !repo) throw new Error('Project not found');

    const since = Date.now() - 86400000;
    const collected: Run[] = [];

    for (let page = 1; page <= (deep ? maxPages : 1); page += 1) {
      const { data } = await octokit().rest.actions.listWorkflowRunsForRepo({
        owner,
        page,
        per_page: 100,
        repo
      });

      collected.push(...data.workflow_runs);

      const oldest = data.workflow_runs.at(-1);
      if (data.workflow_runs.length < 100 || !oldest || new Date(oldest.created_at).getTime() <= since) break;
    }

    // Hidden workflows are filtered in the renderer, not here: it keeps them
    // aside so a card can offer a peek at what it is holding back.
    const runs = collected.filter((run) => new Date(run.created_at).getTime() > since);

    return { runs, success: true };
  } catch (e) {
    log.error(e);
    return { message: e.message, success: false };
  }
});

// "Load older runs" walks the repo's run history one page at a time, with no
// date window: the 24h cutoff belongs to the poll, not to history browsing.
// History is paged per branch, not repo-wide: a card shows one branch, and a
// repo-wide page of 100 runs can hold barely one run of the branch you asked
// about — which made "load more" walk several pages to show a single row.
ipcMain.handle('git:api:getRunsPage', async (_, id: string, page: number, branch?: string) => {
  try {
    const { owner, repo } = await getRepoInfo(id);
    if (!owner || !repo) throw new Error('Project not found');

    const { data } = await octokit().rest.actions.listWorkflowRunsForRepo({
      owner,
      page,
      per_page: 100,
      repo,
      ...(branch ? { branch } : {})
    });
    log.info(`runs history page ${page} of ${branch ?? 'all branches'} for ${owner}/${repo}: ${data.workflow_runs.length} runs`);

    return { last: data.workflow_runs.length < 100, runs: data.workflow_runs, success: true };
  } catch (e) {
    log.error(e);
    return { message: e.message, success: false };
  }
});

// A pinned workflow has to stay on screen even when its last run predates the
// 24h window the poll covers — a deploy that ran on Friday is exactly the one
// you pinned it for. Its latest run is fetched by workflow, not by page.
ipcMain.handle('git:api:getPinnedRuns', async (_, id: string) => {
  try {
    const { pinnedWorkflows = [] } = settings.get('appSettings').gitHubActions;
    if (pinnedWorkflows.length === 0) return { runs: [], success: true };

    const { owner, repo } = await getRepoInfo(id);
    if (!owner || !repo) throw new Error('Project not found');

    const runs: Run[] = [];

    for (const path of pinnedWorkflows.slice(0, 5)) {
      const { data } = await octokit().rest.actions.listWorkflowRuns({
        owner,
        per_page: 1,
        repo,
        workflow_id: path.replace(/^.*\//, '')
      });

      runs.push(...data.workflow_runs);
    }

    return { runs, success: true };
  } catch (e) {
    log.error(e);
    return { message: e.message, success: false };
  }
});

// The runs poll only reaches back 24 hours, so a workflow that last ran a week
// ago is unfindable locally. Searching goes at it from the other end: match the
// query against the repo's workflow names, then ask GitHub for those workflows'
// runs directly.
const searchedWorkflows = 3;
const searchedRunsPerWorkflow = 10;

ipcMain.handle('git:api:searchRuns', async (_, id: string, query: string) => {
  try {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return { runs: [], success: true };

    const { owner, repo } = await getRepoInfo(id);
    if (!owner || !repo) throw new Error('Project not found');

    const { data } = await octokit().rest.actions.listRepoWorkflows({ owner, per_page: 100, repo });

    // Hidden workflows are not skipped here either — the renderer keeps their
    // runs behind the peek fold rather than dropping them.
    const matched = data.workflows
      .filter((workflow) => terms.every((term) => workflow.name.toLowerCase().includes(term)))
      .slice(0, searchedWorkflows);

    const runs: Run[] = [];

    for (const workflow of matched) {
      const { data: page } = await octokit().rest.actions.listWorkflowRuns({
        owner,
        per_page: searchedRunsPerWorkflow,
        repo,
        workflow_id: workflow.id
      });

      runs.push(...page.workflow_runs);
    }

    return { runs, success: true };
  } catch (e) {
    log.error(e);
    return { message: e.message, success: false };
  }
});

ipcMain.handle('git:api:getJobs', async (_, id: string, runId: number) => {
  try {
    const { owner, repo } = await getRepoInfo(id);
    if (!owner || !repo) throw new Error('Project not found');

    const { data } = await octokit().rest.actions.listJobsForWorkflowRun({
      owner,
      repo,
      run_id: runId
    });

    return { jobs: data.jobs, success: true };
  } catch (e) {
    log.error(e);
    return { message: e.message, success: false };
  }
});

ipcMain.handle('git:api:cancelRun', async (_, id: string, runId: number) => {
  try {
    const { owner, repo } = await getRepoInfo(id);
    if (!owner || !repo) throw new Error('Project not found');

    await octokit().rest.actions.cancelWorkflowRun({ owner, repo, run_id: runId });
    return { success: true };
  } catch (e) {
    log.error(e);
    return { message: e.message, success: false };
  }
});

ipcMain.handle('git:api:rerunWorkflow', async (_, id: string, runId: number) => {
  try {
    const { owner, repo } = await getRepoInfo(id);
    if (!owner || !repo) throw new Error('Project not found');

    await octokit().rest.actions.reRunWorkflow({ owner, repo, run_id: runId });
    return { success: true };
  } catch (e) {
    log.error(e);
    return { message: e.message, success: false };
  }
});

ipcMain.handle('git:api:rerunFailedJobs', async (_, id: string, runId: number) => {
  try {
    const { owner, repo } = await getRepoInfo(id);
    if (!owner || !repo) throw new Error('Project not found');

    await octokit().rest.actions.reRunWorkflowFailedJobs({ owner, repo, run_id: runId });
    return { success: true };
  } catch (e) {
    log.error(e);
    return { message: e.message, success: false };
  }
});

ipcMain.handle('git:api:getPRChecks', async (_, id: string, prNumber: number) => {
  try {
    const { owner, repo } = await getRepoInfo(id);
    if (!owner || !repo) throw new Error('Project not found');

    const { data: pr } = await octokit().rest.pulls.get({
      owner,
      pull_number: prNumber,
      repo
    });

    const {sha} = pr.head;

    const { data } = await octokit().rest.checks.listForRef({
      owner,
      ref: sha,
      repo
    });

    const checks = data.check_runs.map((check) => ({
      conclusion: check.conclusion,
      id: check.id,
      name: check.name,
      status: check.status
    }));

    return { checks, success: true };
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

ipcMain.handle('git:api:getOpenPulls', async (_, id: string) => {
  try {
    const { owner, repo } = await getRepoInfo(id);
    if (!owner || !repo) throw new Error('Project not found');

    // 'all' rather than 'open': a merged pull request is how a checkout is
    // known to be finished. Sorted by recency so the page holds what matters.
    const { data } = await octokit().rest.pulls.list({
      direction: 'desc',
      owner,
      per_page: 100,
      repo,
      sort: 'updated',
      state: 'all'
    });

    return { pulls: data, success: true };
  } catch (e) {
    log.error(e);
    return { message: e.message, success: false };
  }
});
