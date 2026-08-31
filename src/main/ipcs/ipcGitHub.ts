import { execFile } from 'child_process';
import { ipcMain, safeStorage } from 'electron';
import log from 'electron-log';
import { Octokit } from 'octokit';
import { type PullType, type Run } from 'types/gitHub';
import { promisify } from 'util';

import { getProjectPath, getRepoInfo } from '../libs/git';
import { settings } from '../settings';

const protectedBranches = ['master', 'main'];

const execFileAsync = promisify(execFile);

// Runs a `gh` command so PR mutations happen server-side on GitHub (never a
// local checkout), using the user's own `gh auth` session. Returns gh's own
// stderr as the error message — it is already human-readable ("Pull request is
// not mergeable", "merge conflict between base and head", …).
const runGh = async (args: string[]): Promise<{ message?: string; success: boolean }> => {
  try {
    await execFileAsync('gh', args, { maxBuffer: 1024 * 1024 });
    return { success: true };
  } catch (e) {
    const err = e as { message?: string; stderr?: string; };
    const raw = (err.stderr || err.message || 'gh command failed').trim();
    // Keep the last meaningful line, then strip gh's leading status glyph
    // ("X ", "✗ ", "! ", …) so the toast reads as a plain sentence.
    const lines = raw.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('Usage:'));
    const message = (lines.at(-1) ?? raw).replace(/^[X✗✔✓!•\-–]\s+/u, '').trim();
    return { message: message || raw, success: false };
  }
};

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

    let { data: pr } = await octokit().rest.pulls.get({
      owner,
      pull_number: prNumber,
      repo
    });

    // GitHub computes mergeable/mergeable_state asynchronously; the first read
    // after any change returns mergeable: null (state 'unknown'). Poll briefly
    // so the Merge affordance reflects the real state instead of staying hidden
    // behind a stale "unknown".
    for (let attempt = 0; attempt < 3 && pr.mergeable === null; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      ({ data: pr } = await octokit().rest.pulls.get({ owner, pull_number: prNumber, repo }));
    }

    const {sha} = pr.head;

    const { data } = await octokit().rest.checks.listForRef({
      owner,
      ref: sha,
      repo
    });

    // GitHub returns every check run for the head SHA, including stale ones a
    // re-run (or a superseding push) replaced — an old "cancelled"/"failure" run
    // sits next to the fresh "in_progress" one of the same name. GitHub's own PR
    // UI shows only the latest run per check name, so dedupe to the newest run
    // (highest id) per name — otherwise the card counts superseded runs as
    // failures the PR doesn't actually have.
    const latestByName = new Map<string, (typeof data.check_runs)[number]>();
    for (const run of data.check_runs) {
      const prev = latestByName.get(run.name);
      if (!prev || run.id > prev.id) latestByName.set(run.name, run);
    }

    const checks = [...latestByName.values()].map((check) => ({
      conclusion: check.conclusion,
      id: check.id,
      name: check.name,
      status: check.status
    }));

    // Review status, GitHub-style: the effective state per reviewer is their
    // most recent non-comment review. A PR reads as "approved" when at least
    // one reviewer's latest review is APPROVED and none is CHANGES_REQUESTED.
    const { data: reviews } = await octokit().rest.pulls.listReviews({
      owner,
      per_page: 100,
      pull_number: prNumber,
      repo
    });

    type ReviewerState = 'approved' | 'changes_requested' | 'commented' | 'pending';
    type Reviewer = {
      avatarUrl: string;
      login: string;
      reReviewRequested: boolean;
      state: ReviewerState;
    };

    const stateMap: Record<string, ReviewerState> = {
      APPROVED: 'approved',
      CHANGES_REQUESTED: 'changes_requested',
      COMMENTED: 'commented'
    };

    // The PR author is never their own reviewer, even when they leave review
    // comments on the thread — GitHub keeps them out of the Reviewers panel.
    const authorLogin = pr.user?.login;

    // Build one entry per reviewer, keyed by login. GitHub's rule: a reviewer's
    // effective state is their most recent APPROVED / CHANGES_REQUESTED verdict;
    // a COMMENTED review never overrides an existing verdict. Reviews arrive
    // oldest-first, so verdicts overwrite freely while COMMENTED only fills a
    // reviewer who has no verdict yet.
    const byLogin = new Map<string, Reviewer>();
    for (const rev of reviews) {
      const login = rev.user?.login;
      const mapped = rev.state ? stateMap[rev.state] : undefined;
      if (!login || !mapped) continue; // skip DISMISSED / PENDING drafts
      if (login === authorLogin) continue;
      const existing = byLogin.get(login);
      if (mapped === 'commented' && existing && existing.state !== 'commented') continue;
      byLogin.set(login, {
        avatarUrl: rev.user?.avatar_url ?? '',
        login,
        reReviewRequested: false,
        state: mapped
      });
    }

    // Requested reviewers who have not reviewed yet are "pending". If they
    // already have a verdict, a fresh request means GitHub is asking for a
    // re-review — flag it (shows the spinner next to their prior verdict, and
    // makes that prior approval stale so it no longer counts toward "approved").
    for (const rr of pr.requested_reviewers ?? []) {
      const login = 'login' in rr ? rr.login : undefined;
      if (!login || login === authorLogin) continue;
      const existing = byLogin.get(login);
      if (existing) {
        existing.reReviewRequested = true;
      } else {
        byLogin.set(login, {
          avatarUrl: 'avatar_url' in rr ? rr.avatar_url : '',
          login,
          reReviewRequested: false,
          state: 'pending'
        });
      }
    }

    const reviewers = [...byLogin.values()];
    // A re-requested approval is stale — it does not count toward the overall
    // "approved" verdict, matching GitHub ("At least 1 approving review is
    // required" persists after a re-request).
    const approvedBy = reviewers.filter((r) => r.state === 'approved' && !r.reReviewRequested).map((r) => r.login);
    const changesRequestedBy = reviewers.filter((r) => r.state === 'changes_requested').map((r) => r.login);

    let reviewState: 'approved' | 'changes_requested' | null = null;
    if (changesRequestedBy.length > 0) reviewState = 'changes_requested';
    else if (approvedBy.length > 0) reviewState = 'approved';

    const review = { approvedBy, changesRequestedBy, reviewers, state: reviewState };

    // One GraphQL round-trip for the things REST can't give us: unresolved
    // review conversations (GitHub blocks merge on these), and whether auto-merge
    // is available / already armed for this PR.
    let unresolvedComments = 0;
    let unresolvedThreads: { avatarUrl: string; count: number; login: string; path: null | string }[] = [];
    let autoMergeAllowed = false;
    let autoMergeEnabled = false;
    let allowedMergeMethods: ('merge' | 'rebase' | 'squash')[] = [];
    try {
      const gql = await octokit().graphql<{
        repository: {
          autoMergeAllowed: boolean;
          mergeCommitAllowed: boolean;
          pullRequest: {
            autoMergeRequest: null | { enabledAt: string };
            reviewThreads: {
              nodes: {
                comments: { nodes: { author: null | { avatarUrl: string; login: string } }[]; totalCount: number };
                isResolved: boolean;
                path: null | string;
              }[];
            };
            viewerCanEnableAutoMerge: boolean;
          };
          rebaseMergeAllowed: boolean;
          squashMergeAllowed: boolean;
        };
      }>(
        `query ($owner: String!, $repo: String!, $num: Int!) {
          repository(owner: $owner, name: $repo) {
            autoMergeAllowed
            squashMergeAllowed
            mergeCommitAllowed
            rebaseMergeAllowed
            pullRequest(number: $num) {
              reviewThreads(first: 100) {
                nodes {
                  isResolved
                  path
                  comments(first: 1) {
                    totalCount
                    nodes { author { login avatarUrl } }
                  }
                }
              }
              viewerCanEnableAutoMerge
              autoMergeRequest { enabledAt }
            }
          }
        }`,
        { num: prNumber, owner, repo }
      );
      const gqlPr = gql.repository.pullRequest;
      const unresolved = gqlPr.reviewThreads.nodes.filter((t) => !t.isResolved);
      unresolvedComments = unresolved.length;
      unresolvedThreads = unresolved.map((t) => ({
        avatarUrl: t.comments.nodes[0]?.author?.avatarUrl ?? '',
        count: t.comments.totalCount,
        login: t.comments.nodes[0]?.author?.login ?? 'unknown',
        path: t.path
      }));
      autoMergeEnabled = Boolean(gqlPr.autoMergeRequest);
      autoMergeAllowed = gql.repository.autoMergeAllowed && gqlPr.viewerCanEnableAutoMerge;
      // Only the merge methods the repo actually enables, in GitHub's order.
      allowedMergeMethods = [
        ...(gql.repository.squashMergeAllowed ? (['squash'] as const) : []),
        ...(gql.repository.mergeCommitAllowed ? (['merge'] as const) : []),
        ...(gql.repository.rebaseMergeAllowed ? (['rebase'] as const) : [])
      ];
    } catch (gqlErr) {
      log.error(gqlErr);
    }

    // Out-of-date detection, independent of mergeable_state: mergeable_state
    // collapses to 'blocked'/'unstable' when other rules block the merge, hiding
    // the "behind" fact. Comparing base...head gives behind_by directly, so the
    // "Update branch" affordance shows whenever the branch is actually behind.
    let behind = false;
    try {
      const { data: cmp } = await octokit().rest.repos.compareCommits({
        base: pr.base.ref,
        head: sha,
        owner,
        repo
      });
      behind = (cmp.behind_by ?? 0) > 0;
    } catch (cmpErr) {
      log.error(cmpErr);
    }

    return {
      // mergeable_state: clean | unstable | has_hooks (mergeable) vs
      // blocked | dirty | behind | draft | unknown (not). Renderer uses it to
      // enable/disable the merge button, matching GitHub.
      allowedMergeMethods,
      autoMergeAllowed,
      autoMergeEnabled,
      behind,
      checks,
      mergeable: pr.mergeable ?? null,
      mergeableState: pr.mergeable_state ?? 'unknown',
      review,
      success: true,
      unresolvedComments,
      unresolvedThreads
    };
  } catch (e) {
    log.error(e);
    return { message: e.message, success: false };
  }
});

ipcMain.handle(
  'git:api:mergePR',
  async (_, id: string, prNumber: number, method: 'merge' | 'rebase' | 'squash') => {
    try {
      const { owner, repo } = await getRepoInfo(id);
      if (!owner || !repo) throw new Error('Project not found');

      // `gh pr merge` merges on GitHub's side (not the local clone). The method
      // flag makes it non-interactive.
      const flag = method === 'squash' ? '--squash' : method === 'rebase' ? '--rebase' : '--merge';
      return await runGh(['pr', 'merge', String(prNumber), '--repo', `${owner}/${repo}`, flag]);
    } catch (e) {
      log.error(e);
      return { message: e.message, success: false };
    }
  }
);

ipcMain.handle(
  'git:api:updateBranch',
  async (_, id: string, prNumber: number, method: 'merge' | 'rebase' = 'merge') => {
    try {
      const { owner, repo } = await getRepoInfo(id);
      if (!owner || !repo) throw new Error('Project not found');

      // `gh pr update-branch` updates the PR head with its base on GitHub's side
      // — a merge commit by default, or a rebase with --rebase.
      const args = ['pr', 'update-branch', String(prNumber), '--repo', `${owner}/${repo}`];
      if (method === 'rebase') args.push('--rebase');
      return await runGh(args);
    } catch (e) {
      log.error(e);
      return { message: e.message, success: false };
    }
  }
);

ipcMain.handle(
  'git:api:enableAutoMerge',
  async (_, id: string, prNumber: number, method: 'merge' | 'rebase' | 'squash') => {
    try {
      const { owner, repo } = await getRepoInfo(id);
      if (!owner || !repo) throw new Error('Project not found');

      // `gh pr merge --auto` arms auto-merge: GitHub merges once every required
      // check and review passes. Method flag picks the strategy.
      const flag = method === 'squash' ? '--squash' : method === 'rebase' ? '--rebase' : '--merge';
      return await runGh(['pr', 'merge', String(prNumber), '--repo', `${owner}/${repo}`, '--auto', flag]);
    } catch (e) {
      log.error(e);
      return { message: e.message, success: false };
    }
  }
);

ipcMain.handle('git:api:disableAutoMerge', async (_, id: string, prNumber: number) => {
  try {
    const { owner, repo } = await getRepoInfo(id);
    if (!owner || !repo) throw new Error('Project not found');

    return await runGh(['pr', 'merge', String(prNumber), '--repo', `${owner}/${repo}`, '--disable-auto']);
  } catch (e) {
    log.error(e);
    return { message: e.message, success: false };
  }
});

// Which files conflict between base and head — the list GitHub shows under
// "This branch has conflicts that must be resolved". Computed locally with
// `git merge-tree` (read-only: writes nothing, pushes nothing) against the
// project's own clone, since GitHub exposes no API for the conflicting paths.
ipcMain.handle('git:api:getConflictFiles', async (_, id: string, prNumber: number) => {
  try {
    const { owner, repo } = await getRepoInfo(id);
    if (!owner || !repo) throw new Error('Project not found');
    const cwd = getProjectPath(id);

    const { data: pr } = await octokit().rest.pulls.get({ owner, pull_number: prNumber, repo });
    const base = pr.base.ref;
    const head = pr.head.ref;

    // Make sure both tips are present locally before the merge test.
    await execFileAsync('git', ['-C', cwd, 'fetch', 'origin', base, head], { maxBuffer: 1024 * 1024 });

    try {
      await execFileAsync(
        'git',
        ['-C', cwd, 'merge-tree', '--write-tree', '--name-only', `origin/${base}`, `origin/${head}`],
        { maxBuffer: 8 * 1024 * 1024 }
      );
      // Exit 0 → merges cleanly, no conflicts.
      return { files: [], success: true };
    } catch (mergeErr) {
      // Exit 1 → conflicts. stdout is: <tree-oid>\n<conflicted paths…>\n\n<info>
      const out = ((mergeErr as { stdout?: string }).stdout ?? '').split('\n');
      out.shift(); // drop the tree OID line
      const files: string[] = [];
      for (const line of out) {
        if (line.trim() === '') break; // blank line ends the file list
        files.push(line.trim());
      }
      return { files, success: true };
    }
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
