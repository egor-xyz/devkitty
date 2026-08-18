# Worktree Checkout Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the project UI so every git worktree — including the main one — renders as its own checkout card carrying its branch, git status, pull request, and GitHub Actions runs.

**Architecture:** A worktree is a checkout; the main repo checkout is the worktree with `isMain: true`. The `Project` component becomes a thin repo header rendering one `CheckoutCard` per worktree. Workflow runs and pull requests are fetched once per repo and distributed to cards by branch name, matching `Run.head_branch` against `Pull.head.ref` and `Worktree.branch`.

**Tech Stack:** Electron 41, React 19, TypeScript 5.9, Blueprint.js 6, Tailwind 4, simple-git 3, Octokit 5, Zustand 5, Vitest 4, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-16-worktree-checkout-cards-design.md`

## Global Constraints

- Package manager is **pnpm**. Test command is `pnpm test` (`vitest run`). Lint is `pnpm lint` (`eslint . --fix`).
- Vitest runs in the **default node environment** — there is no jsdom and no `@testing-library/react`. **Do not write component-rendering tests.** Test pure functions and main-process IPC handlers only.
- IPC handler tests follow the existing pattern: mock `electron`'s `ipcMain.handle` into a `handlers` record, then `await import('./ipcFile')`. See `src/main/ipcs/ipcGit.test.ts:1-36`.
- `src/renderer/test-setup.ts` provides the global `window.bridge` mock. Any new bridge method used by renderer code under test must be added there or the test will throw on `undefined`.
- Object keys and JSX props are **alphabetically sorted** throughout this codebase (enforced by `@egor.xyz/eslint-config`). Keep new code sorted.
- Path aliases: `types/*` → `src/types/*`, `renderer/*` → `src/renderer/*`.
- Changes to `src/main/` or `src/preload/` require restarting `pnpm dev` — hot reload only covers `src/renderer/`.
- **Never commit or push unless explicitly asked.** The commit steps in this plan are the exception: they are explicitly authorized by this plan, one commit per task, staging only the named files. Never `git add -A`.

---

### Task 1: Worktree-scoped git instance

Adds the main-process primitive that every worktree-targeted git operation needs. Without it, `getGit(id)` always resolves to the project root and no worktree can be operated on.

**Files:**
- Modify: `src/main/libs/git.ts`
- Test: `src/main/libs/git.test.ts`

**Interfaces:**
- Consumes: `getGit`, `parseWorktreeList` (already in `src/main/libs/git.ts`)
- Produces: `getWorktreeGit(id: string, worktreePath: string): Promise<SimpleGit>` — throws `Error('Worktree not found for this project')` if `worktreePath` is not listed by that project's `git worktree list`.

- [ ] **Step 1: Write the failing tests**

Append this `describe` block inside the top-level `describe('git', …)` in `src/main/libs/git.test.ts`, after the existing `describe('parseWorktreeList', …)` block:

```ts
  describe('getWorktreeGit', () => {
    const worktreeOutput = `worktree /path/to/main
HEAD abc1234
branch refs/heads/main

worktree /path/to/feature
HEAD def5678
branch refs/heads/feature

`;

    it('should return a git instance bound to the worktree path', async () => {
      const { simpleGit } = await import('simple-git');
      mockSettings.get.mockReturnValue([{ filePath: '/path/to/main', id: 'proj-1', name: 'project' }] as any);
      mockGit.raw.mockResolvedValue(worktreeOutput);

      await getWorktreeGit('proj-1', '/path/to/feature');

      expect(simpleGit).toHaveBeenCalledWith('/path/to/feature');
    });

    it('should throw when the path is not a worktree of this project', async () => {
      mockSettings.get.mockReturnValue([{ filePath: '/path/to/main', id: 'proj-1', name: 'project' }] as any);
      mockGit.raw.mockResolvedValue(worktreeOutput);

      await expect(getWorktreeGit('proj-1', '/somewhere/else')).rejects.toThrow(
        'Worktree not found for this project'
      );
    });

    it('should accept the main worktree path', async () => {
      const { simpleGit } = await import('simple-git');
      mockSettings.get.mockReturnValue([{ filePath: '/path/to/main', id: 'proj-1', name: 'project' }] as any);
      mockGit.raw.mockResolvedValue(worktreeOutput);

      await getWorktreeGit('proj-1', '/path/to/main');

      expect(simpleGit).toHaveBeenCalledWith('/path/to/main');
    });
  });
```

Update the import on `src/main/libs/git.test.ts:30` to include the new export:

```ts
import { getGit, getRepoInfo, getWorktreeGit, parseWorktreeList } from './git';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/main/libs/git.test.ts`
Expected: FAIL — `getWorktreeGit is not a function`.

- [ ] **Step 3: Write the implementation**

In `src/main/libs/git.ts`, add after `parseWorktreeList` (i.e. after line 56):

```ts
export const getWorktreeGit = async (id: string, worktreePath: string) => {
  const git = await getGit(id);

  const raw = await git.raw(['worktree', 'list', '--porcelain']);
  const worktrees = parseWorktreeList(raw);

  if (!worktrees.some((worktree) => worktree.path === worktreePath)) {
    throw new Error('Worktree not found for this project');
  }

  return simpleGit(worktreePath);
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/main/libs/git.test.ts`
Expected: PASS — all `git` tests green, including the three new ones.

- [ ] **Step 5: Commit**

```bash
git add src/main/libs/git.ts src/main/libs/git.test.ts
git commit -m "feat: add getWorktreeGit for worktree-scoped git operations"
```

---

### Task 2: Always report worktrees from git:getStatus

Today `git:getStatus` drops the `worktrees` array when a repo has only the main worktree (`src/main/ipcs/ipcGit.ts:33-35`). The new UI renders its cards *from* that array, so a single-worktree repo would render nothing.

**Files:**
- Modify: `src/main/ipcs/ipcGit.ts:28-38`
- Test: `src/main/ipcs/ipcGit.test.ts`

**Interfaces:**
- Consumes: `parseWorktreeList` (unchanged)
- Produces: `git:getStatus` now returns `worktrees: Worktree[]` with length ≥ 1 for any healthy repo; still `undefined` if the `git worktree list` call throws.

- [ ] **Step 1: Write the failing tests**

Add these two tests inside `describe('git:getStatus', …)` in `src/main/ipcs/ipcGit.test.ts`:

```ts
    it('should return worktrees even when only the main worktree exists', async () => {
      mockGit.status.mockResolvedValue({ current: 'main', files: [], isClean: () => true });
      mockGit.remote.mockResolvedValue('git@github.com:owner/repo.git');
      mockGit.branch.mockResolvedValue({ all: ['main'], current: 'main' });
      mockGit.raw.mockResolvedValue('worktree /path\nHEAD abc\nbranch refs/heads/main\n');
      mockGit.fetch.mockResolvedValue(undefined);
      mockParseWorktreeList.mockReturnValue([{ branch: 'main', isMain: true, path: '/path' }]);

      const result = await handlers['git:getStatus']({}, 'proj-1');

      expect(result.worktrees).toEqual([{ branch: 'main', isMain: true, path: '/path' }]);
    });

    it('should leave worktrees undefined when the worktree list command fails', async () => {
      mockGit.status.mockResolvedValue({ current: 'main', files: [], isClean: () => true });
      mockGit.remote.mockResolvedValue('git@github.com:owner/repo.git');
      mockGit.branch.mockResolvedValue({ all: ['main'], current: 'main' });
      mockGit.raw.mockRejectedValue(new Error('worktree not supported'));
      mockGit.fetch.mockResolvedValue(undefined);

      const result = await handlers['git:getStatus']({}, 'proj-1');

      expect(result.success).toBe(true);
      expect(result.worktrees).toBeUndefined();
    });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/main/ipcs/ipcGit.test.ts`
Expected: FAIL — first test reports `expected undefined to deeply equal [ { branch: 'main', … } ]`.

- [ ] **Step 3: Write the implementation**

In `src/main/ipcs/ipcGit.ts`, replace lines 28-38 with:

```ts
    // Get worktrees
    let worktrees: Worktree[];
    try {
      const raw = await git.raw(['worktree', 'list', '--porcelain']);
      worktrees = parseWorktreeList(raw);
    } catch {
      /* worktree list not supported or failed */
    }
```

Add the type import at the top of the file, after line 3:

```ts
import { type Worktree } from 'types/worktree';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/main/ipcs/ipcGit.test.ts`
Expected: PASS — all `ipcGit` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/main/ipcs/ipcGit.ts src/main/ipcs/ipcGit.test.ts
git commit -m "fix: always report worktrees from git:getStatus"
```

---

### Task 3: Pull a worktree

The only worktree-scoped git mutation in v1. The behind-count badge on a checkout card is useless without it.

**Files:**
- Modify: `src/main/ipcs/ipcWorktree.ts`
- Modify: `src/preload/index.ts:56-62`
- Modify: `src/renderer/test-setup.ts`
- Create: `src/main/ipcs/ipcWorktree.test.ts`

**Interfaces:**
- Consumes: `getWorktreeGit` from Task 1.
- Produces: IPC channel `git:worktree:pull` with args `(id: string, worktreePath: string)` returning `{ message: string; success: boolean }`; bridge method `window.bridge.worktree.pull(id, worktreePath)`.

- [ ] **Step 1: Write the failing test**

Create `src/main/ipcs/ipcWorktree.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const handlers: Record<string, (...args: any[]) => any> = {};

const mockGit = {
  pull: vi.fn(),
  raw: vi.fn(),
  revparse: vi.fn(),
  status: vi.fn()
};

vi.mock('electron', () => ({
  BrowserWindow: { getFocusedWindow: vi.fn() },
  dialog: { showOpenDialog: vi.fn() },
  ipcMain: {
    handle: vi.fn((channel: string, handler: any) => {
      handlers[channel] = handler;
    })
  }
}));

vi.mock('fs/promises', () => ({
  copyFile: vi.fn()
}));

vi.mock('simple-git', () => ({
  simpleGit: vi.fn(() => mockGit)
}));

vi.mock('../libs/git', () => ({
  getGit: vi.fn(() => Promise.resolve(mockGit)),
  getWorktreeGit: vi.fn(() => Promise.resolve(mockGit)),
  parseWorktreeList: vi.fn(() => [])
}));

import { getWorktreeGit } from '../libs/git';

await import('./ipcWorktree');

const mockGetWorktreeGit = vi.mocked(getWorktreeGit);

describe('ipcWorktree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWorktreeGit.mockResolvedValue(mockGit as any);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/ipcs/ipcWorktree.test.ts`
Expected: FAIL — `handlers['git:worktree:pull'] is not a function`.

- [ ] **Step 3: Write the implementation**

In `src/main/ipcs/ipcWorktree.ts`, change the import on line 7 to:

```ts
import { getGit, getWorktreeGit, parseWorktreeList } from '../libs/git';
```

Then append at the end of the file:

```ts
ipcMain.handle('git:worktree:pull', async (_, id: string, worktreePath: string) => {
  try {
    const git = await getWorktreeGit(id, worktreePath);
    await git.pull();

    return { message: 'Worktree pulled', success: true };
  } catch (e) {
    return { message: e.message, success: false };
  }
});
```

In `src/preload/index.ts`, add to the `worktree` object (keep keys alphabetical — it goes between `list` and `remove`):

```ts
    pull: (id: string, worktreePath: string) => ipcRenderer.invoke('git:worktree:pull', id, worktreePath),
```

In `src/renderer/test-setup.ts`, extend the `worktree` mock so renderer tests do not hit `undefined`:

```ts
  worktree: {
    add: vi.fn(),
    getStatus: vi.fn(),
    list: vi.fn(),
    pull: vi.fn(),
    remove: vi.fn()
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS — full suite green.

- [ ] **Step 5: Commit**

```bash
git add src/main/ipcs/ipcWorktree.ts src/main/ipcs/ipcWorktree.test.ts src/preload/index.ts src/renderer/test-setup.ts
git commit -m "feat: add git:worktree:pull for worktree-scoped pulls"
```

---

### Task 4: Fetch workflow runs for all branches

`git:api:getAction` filters runs down to the main checkout's branch and slices to a repo-wide count. Cards keyed by branch need the unfiltered set so the renderer can group and slice per branch.

**Files:**
- Modify: `src/main/ipcs/ipcGitHub.ts`
- Modify: `src/preload/index.ts:23-32`
- Modify: `src/renderer/test-setup.ts`
- Test: `src/main/ipcs/ipcGitHub.test.ts`

**Interfaces:**
- Produces: IPC channel `git:api:getRuns` with args `(id: string)` returning `{ message?: string; runs?: Run[]; success: boolean }`; bridge method `window.bridge.gitAPI.getRuns(id)`. Applies the 24-hour window, the `inProgress` 30-minute window, and the `ignoredWorkflows` path filter — but **no branch filter and no count slice**.

- [ ] **Step 1: Write the failing tests**

Add this `describe` block to `src/main/ipcs/ipcGitHub.test.ts`, inside the top-level `describe`:

```ts
  describe('git:api:getRuns', () => {
    const recent = new Date().toISOString();
    const old = new Date(Date.now() - 90000000).toISOString();

    beforeEach(() => {
      mockGetRepoInfo.mockResolvedValue({ owner: 'owner', repo: 'repo' });
      mockSettings.get.mockReturnValue({
        gitHubActions: { count: 5, inProgress: false },
        gitHubToken: Buffer.from('token')
      } as any);
    });

    it('should return runs from every branch without slicing', async () => {
      mockOctokitInstance.rest.actions.listWorkflowRunsForRepo.mockResolvedValue({
        data: {
          total_count: 3,
          workflow_runs: [
            { created_at: recent, head_branch: 'main', id: 1, path: '.github/workflows/ci.yml' },
            { created_at: recent, head_branch: 'feature', id: 2, path: '.github/workflows/ci.yml' },
            { created_at: recent, head_branch: 'other', id: 3, path: '.github/workflows/ci.yml' }
          ]
        }
      });

      const result = await handlers['git:api:getRuns']({}, 'proj-1');

      expect(result.success).toBe(true);
      expect(result.runs.map((run: any) => run.id)).toEqual([1, 2, 3]);
    });

    it('should drop runs older than 24 hours', async () => {
      mockOctokitInstance.rest.actions.listWorkflowRunsForRepo.mockResolvedValue({
        data: {
          total_count: 2,
          workflow_runs: [
            { created_at: recent, head_branch: 'main', id: 1, path: '.github/workflows/ci.yml' },
            { created_at: old, head_branch: 'main', id: 2, path: '.github/workflows/ci.yml' }
          ]
        }
      });

      const result = await handlers['git:api:getRuns']({}, 'proj-1');

      expect(result.runs.map((run: any) => run.id)).toEqual([1]);
    });

    it('should drop ignored workflows', async () => {
      mockSettings.get.mockReturnValue({
        gitHubActions: { count: 5, ignoredWorkflows: ['.github/workflows/noisy.yml'], inProgress: false },
        gitHubToken: Buffer.from('token')
      } as any);
      mockOctokitInstance.rest.actions.listWorkflowRunsForRepo.mockResolvedValue({
        data: {
          total_count: 2,
          workflow_runs: [
            { created_at: recent, head_branch: 'main', id: 1, path: '.github/workflows/ci.yml' },
            { created_at: recent, head_branch: 'main', id: 2, path: '.github/workflows/noisy.yml' }
          ]
        }
      });

      const result = await handlers['git:api:getRuns']({}, 'proj-1');

      expect(result.runs.map((run: any) => run.id)).toEqual([1]);
    });

    it('should fail when the repo cannot be resolved', async () => {
      mockGetRepoInfo.mockResolvedValue({});

      const result = await handlers['git:api:getRuns']({}, 'proj-1');

      expect(result).toEqual({ message: 'Project not found', success: false });
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/main/ipcs/ipcGitHub.test.ts`
Expected: FAIL — `handlers['git:api:getRuns'] is not a function`.

- [ ] **Step 3: Write the implementation**

In `src/main/ipcs/ipcGitHub.ts`, add after the existing `git:api:getAction` handler (after line 94):

```ts
ipcMain.handle('git:api:getRuns', async (_, id: string) => {
  try {
    const { gitHubActions } = settings.get('appSettings');
    const { ignoredWorkflows = [], inProgress } = gitHubActions;

    const { owner, repo } = await getRepoInfo(id);
    if (!owner || !repo) throw new Error('Project not found');

    const { data } = await octokit().rest.actions.listWorkflowRunsForRepo({
      owner,
      per_page: 100,
      repo
    });

    const runs = data.workflow_runs
      .filter((run) => new Date(run.created_at).getTime() > Date.now() - 86400000)
      .filter(
        (run) =>
          !inProgress || run.status === 'in_progress' || new Date(run.created_at).getTime() > Date.now() - 1800000
      )
      .filter((run) => !ignoredWorkflows.includes(run.path));

    return { runs, success: true };
  } catch (e) {
    log.error(e);
    return { message: e.message, success: false };
  }
});
```

In `src/preload/index.ts`, add to the `gitAPI` object (alphabetical — between `getPulls` and `rerunFailedJobs`):

```ts
    getRuns: (id: string) => ipcRenderer.invoke('git:api:getRuns', id),
```

In `src/renderer/test-setup.ts`, add `getRuns: vi.fn(),` to the `gitAPI` mock object (alphabetical).

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS — full suite green.

- [ ] **Step 5: Commit**

```bash
git add src/main/ipcs/ipcGitHub.ts src/main/ipcs/ipcGitHub.test.ts src/preload/index.ts src/renderer/test-setup.ts
git commit -m "feat: add git:api:getRuns returning runs for all branches"
```

---

### Task 5: Fetch open pull requests with head refs

`search.issuesAndPullRequests` items carry no head ref, so no pull request can be matched to a branch. `rest.pulls.list` returns `head.ref` and also surfaces PRs opened by other people on a branch you have checked out.

**Files:**
- Modify: `src/types/gitHub.ts:4-6`
- Modify: `src/main/ipcs/ipcGitHub.ts`
- Modify: `src/preload/index.ts:23-32`
- Modify: `src/renderer/test-setup.ts`
- Test: `src/main/ipcs/ipcGitHub.test.ts`

**Interfaces:**
- Produces: `Pull` type is now the `rest.pulls.list` element type (adds `head.ref`; keeps `created_at`, `draft`, `html_url`, `id`, `labels`, `number`, `title`, `user` — every field `PullRequest.tsx` reads). IPC channel `git:api:getOpenPulls` with args `(id: string)` returning `{ message?: string; pulls?: Pull[]; success: boolean }`; bridge method `window.bridge.gitAPI.getOpenPulls(id)`.
- `git:api:getPulls` (the search-based one) is **kept unchanged** — Task 7 uses it only to read PR numbers for tagging.

- [ ] **Step 1: Write the failing tests**

First extend the Octokit mock in `src/main/ipcs/ipcGitHub.test.ts` — the `mockOctokitInstance.rest` object currently has no `pulls` key. Add it (alphabetical, after `git`):

```ts
    pulls: {
      get: vi.fn(),
      list: vi.fn()
    },
```

Then add this `describe` block inside the top-level `describe`:

```ts
  describe('git:api:getOpenPulls', () => {
    beforeEach(() => {
      mockGetRepoInfo.mockResolvedValue({ owner: 'owner', repo: 'repo' });
      mockSettings.get.mockReturnValue({ gitHubToken: Buffer.from('token') } as any);
    });

    it('should list open pull requests with head refs', async () => {
      mockOctokitInstance.rest.pulls.list.mockResolvedValue({
        data: [
          { head: { ref: 'feature' }, id: 10, number: 42 },
          { head: { ref: 'fix' }, id: 11, number: 43 }
        ]
      });

      const result = await handlers['git:api:getOpenPulls']({}, 'proj-1');

      expect(mockOctokitInstance.rest.pulls.list).toHaveBeenCalledWith({
        owner: 'owner',
        per_page: 100,
        repo: 'repo',
        state: 'open'
      });
      expect(result).toEqual({
        pulls: [
          { head: { ref: 'feature' }, id: 10, number: 42 },
          { head: { ref: 'fix' }, id: 11, number: 43 }
        ],
        success: true
      });
    });

    it('should fail when the repo cannot be resolved', async () => {
      mockGetRepoInfo.mockResolvedValue({});

      const result = await handlers['git:api:getOpenPulls']({}, 'proj-1');

      expect(result).toEqual({ message: 'Project not found', success: false });
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/main/ipcs/ipcGitHub.test.ts`
Expected: FAIL — `handlers['git:api:getOpenPulls'] is not a function`.

- [ ] **Step 3: Write the implementation**

In `src/types/gitHub.ts`, replace the `Pull` type (lines 4-6) with:

```ts
export type Pull = GetResponseDataTypeFromEndpointMethod<typeof Octokit.prototype.rest.pulls.list>[0];
```

In `src/main/ipcs/ipcGitHub.ts`, add at the end of the file:

```ts
ipcMain.handle('git:api:getOpenPulls', async (_, id: string) => {
  try {
    const { owner, repo } = await getRepoInfo(id);
    if (!owner || !repo) throw new Error('Project not found');

    const { data } = await octokit().rest.pulls.list({
      owner,
      per_page: 100,
      repo,
      state: 'open'
    });

    return { pulls: data, success: true };
  } catch (e) {
    log.error(e);
    return { message: e.message, success: false };
  }
});
```

In `src/preload/index.ts`, add to `gitAPI` (alphabetical — between `getJobs` and `getPRChecks`):

```ts
    getOpenPulls: (id: string) => ipcRenderer.invoke('git:api:getOpenPulls', id),
```

In `src/renderer/test-setup.ts`, add `getOpenPulls: vi.fn(),` to the `gitAPI` mock object (alphabetical).

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test && pnpm lint`
Expected: PASS — full suite green, no TypeScript errors from the `Pull` type change.

- [ ] **Step 5: Commit**

```bash
git add src/types/gitHub.ts src/main/ipcs/ipcGitHub.ts src/main/ipcs/ipcGitHub.test.ts src/preload/index.ts src/renderer/test-setup.ts
git commit -m "feat: fetch open pull requests with head refs via pulls.list"
```

---

### Task 6: Branch grouping logic

All the branch-matching logic lives here as pure functions, so it is testable in the node environment. Task 7's hook becomes a thin fetch-and-poll wrapper around these.

**Files:**
- Create: `src/renderer/components/Project/hooks/useRepoData/groupByBranch.ts`
- Test: `src/renderer/components/Project/hooks/useRepoData/groupByBranch.test.ts`

**Interfaces:**
- Consumes: `Pull`, `Run` from `types/gitHub` (Task 5 changed `Pull`).
- Produces:
  - `type PullWithTags = { pull: Pull; tags: string[] }`
  - `tagPulls(pulls: Pull[], authoredNumbers: number[], reviewRequestedNumbers: number[]): PullWithTags[]`
  - `groupPullsByBranch(pulls: PullWithTags[]): Record<string, PullWithTags[]>`
  - `groupRunsByBranch(runs: Run[], countPerBranch: number): Record<string, Run[]>`
  - `orphanPulls(pullsByBranch: Record<string, PullWithTags[]>, branches: string[]): PullWithTags[]`

- [ ] **Step 1: Write the failing tests**

Create `src/renderer/components/Project/hooks/useRepoData/groupByBranch.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { groupPullsByBranch, groupRunsByBranch, orphanPulls, tagPulls } from './groupByBranch';

const pull = (id: number, number: number, ref: string) => ({ head: { ref }, id, number }) as any;
const run = (id: number, branch: string, createdAt: string) =>
  ({ created_at: createdAt, head_branch: branch, id }) as any;

describe('tagPulls', () => {
  it('should tag authored pulls as My', () => {
    const result = tagPulls([pull(1, 42, 'feature')], [42], []);

    expect(result).toEqual([{ pull: pull(1, 42, 'feature'), tags: ['My'] }]);
  });

  it('should tag review-requested pulls', () => {
    const result = tagPulls([pull(1, 42, 'feature')], [], [42]);

    expect(result[0].tags).toEqual(['Review requested']);
  });

  it('should apply both tags to the same pull', () => {
    const result = tagPulls([pull(1, 42, 'feature')], [42], [42]);

    expect(result[0].tags).toEqual(['My', 'Review requested']);
  });

  it('should leave untagged pulls with an empty tag list', () => {
    const result = tagPulls([pull(1, 42, 'feature')], [99], [98]);

    expect(result[0].tags).toEqual([]);
  });
});

describe('groupPullsByBranch', () => {
  it('should key pulls by their head ref', () => {
    const items = tagPulls([pull(1, 42, 'feature'), pull(2, 43, 'fix')], [], []);

    const result = groupPullsByBranch(items);

    expect(Object.keys(result).sort()).toEqual(['feature', 'fix']);
    expect(result.feature).toHaveLength(1);
    expect(result.feature[0].pull.number).toBe(42);
  });

  it('should collect multiple pulls on the same branch', () => {
    const items = tagPulls([pull(1, 42, 'feature'), pull(2, 44, 'feature')], [], []);

    const result = groupPullsByBranch(items);

    expect(result.feature).toHaveLength(2);
  });

  it('should skip pulls without a head ref', () => {
    const result = groupPullsByBranch([{ pull: { id: 1, number: 42 } as any, tags: [] }]);

    expect(result).toEqual({});
  });
});

describe('groupRunsByBranch', () => {
  it('should key runs by head_branch', () => {
    const runs = [run(1, 'main', '2026-08-16T10:00:00Z'), run(2, 'feature', '2026-08-16T10:00:00Z')];

    const result = groupRunsByBranch(runs, 5);

    expect(Object.keys(result).sort()).toEqual(['feature', 'main']);
  });

  it('should sort runs newest first within a branch', () => {
    const runs = [
      run(1, 'main', '2026-08-16T09:00:00Z'),
      run(2, 'main', '2026-08-16T11:00:00Z'),
      run(3, 'main', '2026-08-16T10:00:00Z')
    ];

    const result = groupRunsByBranch(runs, 5);

    expect(result.main.map((item) => item.id)).toEqual([2, 3, 1]);
  });

  it('should slice each branch to countPerBranch independently', () => {
    const runs = [
      run(1, 'main', '2026-08-16T11:00:00Z'),
      run(2, 'main', '2026-08-16T10:00:00Z'),
      run(3, 'main', '2026-08-16T09:00:00Z'),
      run(4, 'feature', '2026-08-16T11:00:00Z'),
      run(5, 'feature', '2026-08-16T10:00:00Z')
    ];

    const result = groupRunsByBranch(runs, 2);

    expect(result.main.map((item) => item.id)).toEqual([1, 2]);
    expect(result.feature.map((item) => item.id)).toEqual([4, 5]);
  });

  it('should skip runs without a head_branch', () => {
    const result = groupRunsByBranch([{ created_at: '2026-08-16T10:00:00Z', head_branch: null, id: 1 } as any], 5);

    expect(result).toEqual({});
  });
});

describe('orphanPulls', () => {
  it('should return pulls whose branch has no worktree', () => {
    const grouped = groupPullsByBranch(tagPulls([pull(1, 42, 'feature'), pull(2, 43, 'stray')], [], []));

    const result = orphanPulls(grouped, ['main', 'feature']);

    expect(result).toHaveLength(1);
    expect(result[0].pull.number).toBe(43);
  });

  it('should return an empty array when every branch has a worktree', () => {
    const grouped = groupPullsByBranch(tagPulls([pull(1, 42, 'feature')], [], []));

    expect(orphanPulls(grouped, ['feature'])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/renderer/components/Project/hooks/useRepoData/groupByBranch.test.ts`
Expected: FAIL — cannot resolve module `./groupByBranch`.

- [ ] **Step 3: Write the implementation**

Create `src/renderer/components/Project/hooks/useRepoData/groupByBranch.ts`:

```ts
import { type Pull, type Run } from 'types/gitHub';

export type PullWithTags = {
  pull: Pull;
  tags: string[];
};

export const tagPulls = (
  pulls: Pull[],
  authoredNumbers: number[],
  reviewRequestedNumbers: number[]
): PullWithTags[] => {
  const authored = new Set(authoredNumbers);
  const reviewRequested = new Set(reviewRequestedNumbers);

  return pulls.map((pull) => {
    const tags: string[] = [];
    if (authored.has(pull.number)) tags.push('My');
    if (reviewRequested.has(pull.number)) tags.push('Review requested');

    return { pull, tags };
  });
};

export const groupPullsByBranch = (pulls: PullWithTags[]): Record<string, PullWithTags[]> => {
  const grouped: Record<string, PullWithTags[]> = {};

  for (const item of pulls) {
    const branch = item.pull.head?.ref;
    if (!branch) continue;

    grouped[branch] = grouped[branch] ?? [];
    grouped[branch].push(item);
  }

  return grouped;
};

export const groupRunsByBranch = (runs: Run[], countPerBranch: number): Record<string, Run[]> => {
  const grouped: Record<string, Run[]> = {};

  for (const run of runs) {
    const branch = run.head_branch;
    if (!branch) continue;

    grouped[branch] = grouped[branch] ?? [];
    grouped[branch].push(run);
  }

  for (const branch of Object.keys(grouped)) {
    grouped[branch] = grouped[branch]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, countPerBranch);
  }

  return grouped;
};

export const orphanPulls = (
  pullsByBranch: Record<string, PullWithTags[]>,
  branches: string[]
): PullWithTags[] => {
  const owned = new Set(branches);

  return Object.entries(pullsByBranch)
    .filter(([branch]) => !owned.has(branch))
    .flatMap(([, items]) => items);
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/renderer/components/Project/hooks/useRepoData/groupByBranch.test.ts`
Expected: PASS — all 14 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/Project/hooks/useRepoData/groupByBranch.ts src/renderer/components/Project/hooks/useRepoData/groupByBranch.test.ts
git commit -m "feat: add pure branch-grouping helpers for runs and pulls"
```

---

### Task 7: Repo-level data hook

One fetch and poll cycle per repo, feeding every checkout card. Replaces the per-card fetching in `useActions` and `usePulls`.

**Files:**
- Create: `src/renderer/components/Project/hooks/useRepoData/useRepoData.tsx`
- Create: `src/renderer/components/Project/hooks/useRepoData/index.ts`

**Interfaces:**
- Consumes: `groupPullsByBranch`, `groupRunsByBranch`, `orphanPulls`, `tagPulls`, `PullWithTags` (Task 6); `window.bridge.gitAPI.getRuns` (Task 4); `window.bridge.gitAPI.getOpenPulls` (Task 5); `window.bridge.gitAPI.getPulls` (existing).
- Produces: `useRepoData(project: Project)` returning
  ```ts
  {
    clearHiddenPulls: () => void;
    clearHiddenRuns: () => void;
    getOrphanPulls: (branches: string[]) => PullWithTags[];
    hiddenPullCount: number;
    hiddenRunCount: number;
    hidePull: (pullId: number) => void;
    hideRun: (runId: number) => void;
    pullsByBranch: Record<string, PullWithTags[]>;
    refresh: () => void;
    runsByBranch: Record<string, Run[]>;
  }
  ```

- [ ] **Step 1: Write the implementation**

There is no test step for this task — the hook is a React effect/fetch shell around Task 6's pure functions, and this repo cannot render hooks in tests (no jsdom, no `@testing-library/react`). All logic worth asserting is already covered by `groupByBranch.test.ts`.

Create `src/renderer/components/Project/hooks/useRepoData/useRepoData.tsx`:

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { type Run } from 'types/gitHub';
import { type Project } from 'types/project';

import {
  groupPullsByBranch,
  groupRunsByBranch,
  orphanPulls,
  type PullWithTags,
  tagPulls
} from './groupByBranch';

const hiddenRunsKey = (id: string) => `hiddenActions:${id}`;
const hiddenPullsKey = (id: string) => `hiddenPulls:${id}`;

const getHidden = (key: string): Set<number> => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

export const useRepoData = (project: Project) => {
  const [runs, setRuns] = useState<Run[]>([]);
  const [pulls, setPulls] = useState<PullWithTags[]>([]);
  const [hiddenRuns, setHiddenRuns] = useState(() => getHidden(hiddenRunsKey(project.id)));
  const [hiddenPulls, setHiddenPulls] = useState(() => getHidden(hiddenPullsKey(project.id)));

  const {
    fetchInterval,
    gitHubActions: { count, ignoreDependabot, notifications = true },
    gitHubPulls,
    gitHubToken
  } = useAppSettings();

  const runsIntervalId = useRef<null | number>(null);
  const pullsIntervalId = useRef<null | number>(null);
  const prevConclusions = useRef<Map<number, null | string>>(new Map());

  const getRuns = useCallback(async () => {
    if (!gitHubToken) return;

    const res = await window.bridge.gitAPI.getRuns(project.id);
    if (!res.success) {
      setRuns([]);
      return;
    }

    const nextRuns: Run[] = ignoreDependabot
      ? (res.runs ?? []).filter((run: Run) => !run.actor?.login?.toLowerCase().includes('dependabot'))
      : (res.runs ?? []);

    for (const run of nextRuns) {
      const prev = prevConclusions.current.get(run.id);
      if (prev === undefined && prevConclusions.current.size > 0 && run.conclusion) {
        // New run that already has a conclusion — skip notification
      } else if (prev !== undefined && !prev && run.conclusion && notifications) {
        const status = run.conclusion === 'success' ? 'passed' : 'failed';
        const event = run.event !== 'workflow_dispatch' ? run.event : 'manual';
        window.bridge.notification.show(
          `${project.name}: ${run.name} ${status}`,
          `${event} » ${run.head_branch} (#${run.run_number})\n${run.display_title}`
        );
      }
      prevConclusions.current.set(run.id, run.conclusion ?? null);
    }

    setRuns(nextRuns);
  }, [gitHubToken, ignoreDependabot, notifications, project.id, project.name]);

  const getPulls = useCallback(async () => {
    if (!gitHubToken) return;

    const [openRes, authorRes, reviewRes] = await Promise.all([
      window.bridge.gitAPI.getOpenPulls(project.id),
      window.bridge.gitAPI.getPulls(project.id, 'author'),
      window.bridge.gitAPI.getPulls(project.id, 'review-requested')
    ]);

    if (!openRes.success) {
      setPulls([]);
      return;
    }

    const numbersOf = (res: { pulls?: { number: number }[]; success: boolean }) =>
      res.success ? (res.pulls ?? []).map((item) => item.number) : [];

    setPulls(tagPulls(openRes.pulls ?? [], numbersOf(authorRes), numbersOf(reviewRes)));
  }, [gitHubToken, project.id]);

  useEffect(() => {
    if (!gitHubToken) return;

    getRuns();

    const startPolling = () => {
      if (!runsIntervalId.current && fetchInterval > 2000) {
        runsIntervalId.current = window.setInterval(getRuns, fetchInterval);
      }
    };

    const stopPolling = () => {
      if (runsIntervalId.current) {
        window.clearInterval(runsIntervalId.current);
        runsIntervalId.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        getRuns();
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchInterval, getRuns, gitHubToken]);

  useEffect(() => {
    if (!gitHubToken) return;

    getPulls();

    if (!pullsIntervalId.current) {
      pullsIntervalId.current = window.setInterval(getPulls, gitHubPulls.pollInterval);
    }

    return () => {
      if (pullsIntervalId.current) {
        window.clearInterval(pullsIntervalId.current);
        pullsIntervalId.current = null;
      }
    };
  }, [getPulls, gitHubPulls.pollInterval, gitHubToken]);

  const hideRun = useCallback(
    (runId: number) => {
      setHiddenRuns((prev) => {
        const next = new Set(prev);
        next.add(runId);
        sessionStorage.setItem(hiddenRunsKey(project.id), JSON.stringify([...next]));
        return next;
      });
    },
    [project.id]
  );

  const hidePull = useCallback(
    (pullId: number) => {
      setHiddenPulls((prev) => {
        const next = new Set(prev);
        next.add(pullId);
        sessionStorage.setItem(hiddenPullsKey(project.id), JSON.stringify([...next]));
        return next;
      });
    },
    [project.id]
  );

  const clearHiddenRuns = useCallback(() => {
    sessionStorage.removeItem(hiddenRunsKey(project.id));
    setHiddenRuns(new Set());
  }, [project.id]);

  const clearHiddenPulls = useCallback(() => {
    sessionStorage.removeItem(hiddenPullsKey(project.id));
    setHiddenPulls(new Set());
  }, [project.id]);

  const runsByBranch = useMemo(
    () => groupRunsByBranch(runs.filter((run) => !hiddenRuns.has(run.id)), count),
    [count, hiddenRuns, runs]
  );

  const pullsByBranch = useMemo(
    () => groupPullsByBranch(pulls.filter(({ pull }) => !hiddenPulls.has(pull.id))),
    [hiddenPulls, pulls]
  );

  const getOrphanPulls = useCallback(
    (branches: string[]) => orphanPulls(pullsByBranch, branches),
    [pullsByBranch]
  );

  const refresh = useCallback(() => {
    getRuns();
    getPulls();
  }, [getPulls, getRuns]);

  return {
    clearHiddenPulls,
    clearHiddenRuns,
    getOrphanPulls,
    hiddenPullCount: hiddenPulls.size,
    hiddenRunCount: hiddenRuns.size,
    hidePull,
    hideRun,
    pullsByBranch,
    refresh,
    runsByBranch
  };
};
```

Create `src/renderer/components/Project/hooks/useRepoData/index.ts`:

```ts
export * from './useRepoData';
```

- [ ] **Step 2: Verify it type-checks and the suite still passes**

Run: `pnpm test && pnpm lint`
Expected: PASS — no new type errors, existing tests unaffected (nothing imports the hook yet).

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/Project/hooks/useRepoData/useRepoData.tsx src/renderer/components/Project/hooks/useRepoData/index.ts
git commit -m "feat: add repo-level useRepoData hook fetching runs and pulls once"
```

---

### Task 8: Checkout card component

One card per worktree — main included. Replaces `WorktreeRow` and absorbs the actions/pulls rendering that lived in `useActions`/`usePulls`.

**Files:**
- Create: `src/renderer/components/Project/components/CheckoutCard/CheckoutCard.tsx`
- Create: `src/renderer/components/Project/components/CheckoutCard/index.ts`

**Interfaces:**
- Consumes: `PullWithTags` (Task 6); `window.bridge.worktree.getStatus`, `window.bridge.worktree.pull` (Task 3); existing `Workflow`, `PullRequest`, `GitStatusBadge`, `CheckoutBranch` components.
- Produces: `CheckoutCard` accepting

  ```ts
  type Props = {
    gitStatus?: GitStatus;
    onHidePull: (pullId: number) => void;
    onHideRun: (runId: number) => void;
    onIgnoreWorkflow: (workflowName: string, workflowPath: string) => void;
    onRefresh: () => void;
    project: Project;
    pulls: PullWithTags[];
    runs: Run[];
    worktree: Worktree;
  };
  ```

  `gitStatus` is passed only for the main worktree (its status is already loaded by `useGit`); non-main cards fetch their own status via `window.bridge.worktree.getStatus`.

- [ ] **Step 1: Write the implementation**

No test step — this is a presentational component, and this repo has no renderer test environment (see Global Constraints).

Create `src/renderer/components/Project/components/CheckoutCard/CheckoutCard.tsx`:

```tsx
import { Button, ButtonGroup, Icon, Tooltip } from '@blueprintjs/core';
import { Fragment, type FC, useCallback, useEffect, useRef, useState } from 'react';
import { ActionsIcon } from 'renderer/assets/gitHubIcons';
import { GitStatusBadge } from 'renderer/components/GitStatusBadge';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { useModal } from 'renderer/hooks/useModal';
import { cn } from 'renderer/utils/cn';
import { type Run } from 'types/gitHub';
import { type GitStatus, type Project } from 'types/project';
import { type Worktree } from 'types/worktree';

import { type PullWithTags } from '../../hooks/useRepoData/groupByBranch';
import { CheckoutBranch } from '../CheckoutBranch';
import { PullRequest } from '../PullRequest';
import { Workflow } from '../Workflow';

type Props = {
  gitStatus?: GitStatus;
  onHidePull: (pullId: number) => void;
  onHideRun: (runId: number) => void;
  onIgnoreWorkflow: (workflowName: string, workflowPath: string) => void;
  onRefresh: () => void;
  project: Project;
  pulls: PullWithTags[];
  runs: Run[];
  worktree: Worktree;
};

type CheckoutStatus = {
  ahead: number;
  behind: number;
  modified: string[];
};

const expandedKey = (projectId: string, path: string) => `showChecks:${projectId}:${path}`;

const readExpanded = (projectId: string, path: string): boolean | null => {
  const saved = localStorage.getItem(expandedKey(projectId, path));
  return saved ? JSON.parse(saved) : null;
};

export const CheckoutCard: FC<Props> = ({
  gitStatus,
  onHidePull,
  onHideRun,
  onIgnoreWorkflow,
  onRefresh,
  project,
  pulls,
  runs,
  worktree
}) => {
  const { openModal } = useModal();
  const { selectedEditor, selectedShell } = useAppSettings();
  const [status, setStatus] = useState<CheckoutStatus | null>(null);
  const [pullLoading, setPullLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(() => readExpanded(project.id, worktree.path) ?? false);
  const autoExpanded = useRef(false);

  const { isMain } = worktree;
  const abbreviated = worktree.path.replace(/^.*\//, '.../');

  const fetchStatus = useCallback(async () => {
    if (isMain) return;

    const res = await window.bridge.worktree.getStatus(worktree.path);
    if (res.success && res.status) {
      setStatus({
        ahead: res.status.ahead,
        behind: res.status.behind,
        modified: res.status.modified
      });
    }
  }, [isMain, worktree.path]);

  useEffect(() => {
    if (isMain) {
      setStatus(
        gitStatus?.status
          ? {
              ahead: gitStatus.status.ahead,
              behind: gitStatus.status.behind,
              modified: gitStatus.status.modified
            }
          : null
      );
      return;
    }

    fetchStatus();
  }, [fetchStatus, gitStatus, isMain]);

  // Auto-expand once when this checkout has a failing run, unless the user
  // already made an explicit choice for this card.
  useEffect(() => {
    if (autoExpanded.current) return;
    if (readExpanded(project.id, worktree.path) !== null) return;
    if (!runs.some((run) => run.conclusion === 'failure')) return;

    autoExpanded.current = true;
    setExpanded(true);
  }, [project.id, runs, worktree.path]);

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(expandedKey(project.id, worktree.path), JSON.stringify(next));
      return next;
    });
  };

  const runPull = async () => {
    setPullLoading(true);
    if (isMain) {
      await window.bridge.git.pull(project.id);
    } else {
      await window.bridge.worktree.pull(project.id, worktree.path);
    }
    setPullLoading(false);
    await fetchStatus();
    onRefresh();
  };

  const handleDelete = () => {
    openModal({
      name: 'git:worktree:remove',
      props: {
        branch: worktree.branch,
        id: project.id,
        onSuccess: async () => {
          setDeleting(true);
          onRefresh();
        },
        worktreePath: worktree.path
      }
    });
  };

  const runRows = runs.map((run) => (
    <Workflow
      key={run.id}
      onHide={onHideRun}
      onIgnore={onIgnoreWorkflow}
      onRefresh={onRefresh}
      project={project}
      run={run}
    />
  ));

  return (
    <>
      <div
        className={cn(
          'flex relative items-center justify-between min-h-[45px] py-1 pl-5 pr-4 gap-2 w-full box-border shrink-0 mt-0.5',
          'bg-bp-light-gray-4 dark:bg-bp-dark-gray-2',
          deleting && 'opacity-50 pointer-events-none'
        )}
      >
        <div className="overflow-hidden flex text-left justify-start gap-4 items-center flex-1 min-w-0">
          <div className="w-[30px] shrink-0 flex justify-center">
            {deleting ? (
              <Icon className="animate-spin"
                icon="refresh"
              />
            ) : (
              <Icon icon={isMain ? 'home' : 'diagram-tree'} />
            )}
          </div>

          <div className="overflow-hidden flex flex-col">
            <div className="overflow-hidden text-ellipsis whitespace-nowrap">
              <b>{worktree.branch}</b>
            </div>

            <Tooltip content={worktree.path}>
              <div className="overflow-hidden whitespace-nowrap text-ellipsis -mt-0.5 text-[11px] font-light dark:text-bp-gray-3">
                {abbreviated}
              </div>
            </Tooltip>
          </div>

          {status && (
            <div className="flex select-none">
              <GitStatusBadge
                count={status.modified.length}
                icon="document"
                intent="danger"
                show={Boolean(status.modified.length)}
                tooltip={
                  <>
                    <b>{worktree.branch}</b> has <b>{status.modified.length}</b> uncommited changed file
                    {status.modified.length > 1 ? 's' : ''}
                  </>
                }
              />

              <GitStatusBadge
                count={status.ahead}
                icon="arrow-up"
                intent="warning"
                show={Boolean(status.ahead)}
                tooltip={
                  <>
                    <b>{worktree.branch}</b> has <b>{status.ahead}</b> ahead commit{status.ahead > 1 ? 's' : ''}
                  </>
                }
              />

              <GitStatusBadge
                count={status.behind}
                icon="arrow-down"
                intent="primary"
                show={Boolean(status.behind)}
                tooltip={
                  <>
                    <b>{worktree.branch}</b> has <b>{status.behind}</b> behind commit{status.behind > 1 ? 's' : ''}
                  </>
                }
              />
            </div>
          )}
        </div>

        {isMain && (
          <div className="flex min-w-[240px]">
            <CheckoutBranch
              getStatus={onRefresh}
              gitStatus={gitStatus}
              id={project.id}
              name={project.name}
            />
          </div>
        )}

        <ButtonGroup>
          <Tooltip compact
            content="Actions & pull requests"
            hoverOpenDelay={500}
            placement="bottom"
          >
            <Button
              active={expanded}
              icon={<ActionsIcon />}
              onClick={toggleExpanded}
            />
          </Tooltip>

          {Boolean(status?.behind) && (
            <Tooltip compact
              content="Pull"
              hoverOpenDelay={500}
              placement="bottom"
            >
              <Button
                disabled={deleting}
                icon="arrow-down"
                intent="warning"
                loading={pullLoading}
                onClick={runPull}
              />
            </Tooltip>
          )}

          {selectedEditor && (
            <Tooltip compact
              content={selectedEditor.editor}
              hoverOpenDelay={500}
              placement="bottom"
              popoverClassName="whitespace-nowrap"
            >
              <Button
                disabled={deleting}
                icon="code"
                onClick={() => window.bridge.launch.editor(worktree.path, selectedEditor)}
              />
            </Tooltip>
          )}

          {selectedShell && (
            <Tooltip compact
              content={selectedShell.shell}
              hoverOpenDelay={500}
              placement="bottom"
              popoverClassName="whitespace-nowrap"
            >
              <Button
                disabled={deleting}
                icon="console"
                onClick={() => window.bridge.launch.shell(worktree.path, selectedShell)}
              />
            </Tooltip>
          )}

          {!isMain && (
            <Tooltip compact
              content="Remove worktree"
              hoverOpenDelay={500}
              placement="bottom"
            >
              <Button
                disabled={deleting}
                icon="trash"
                loading={deleting}
                onClick={handleDelete}
              />
            </Tooltip>
          )}
        </ButtonGroup>
      </div>

      {expanded && (
        <div className="pl-5">
          {pulls.map(({ pull, tags }, index) => (
            <Fragment key={pull.id}>
              <PullRequest
                onHide={onHidePull}
                projectId={project.id}
                pull={pull}
                tags={tags}
              />

              {index === 0 && <div className="pl-5">{runRows}</div>}
            </Fragment>
          ))}

          {pulls.length === 0 && runRows}
        </div>
      )}
    </>
  );
};
```

Create `src/renderer/components/Project/components/CheckoutCard/index.ts`:

```ts
export * from './CheckoutCard';
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm lint && pnpm test`
Expected: PASS — no type errors. Nothing renders `CheckoutCard` yet, so behaviour is unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/Project/components/CheckoutCard/CheckoutCard.tsx src/renderer/components/Project/components/CheckoutCard/index.ts
git commit -m "feat: add CheckoutCard rendering a worktree with its pulls and runs"
```

---

### Task 9: Rewire the project card and remove the old path

Turns `Project` into a repo shell, wires `useRepoData` and `CheckoutCard` in, and deletes the superseded code so there is exactly one way to render a checkout.

**Files:**
- Modify: `src/renderer/components/Project/Project.tsx`
- Modify: `src/renderer/components/Project/components/QuickActions/QuickActions.tsx`
- Modify: `src/main/ipcs/ipcGitHub.ts:58-94` (delete `git:api:getAction`)
- Modify: `src/preload/index.ts:25` (delete `getAction`)
- Modify: `src/renderer/test-setup.ts` (delete `getAction` from the mock)
- Delete: `src/renderer/components/Project/hooks/useActions/` (both files)
- Delete: `src/renderer/components/Project/hooks/usePulls/` (both files)
- Delete: `src/renderer/components/Project/components/WorktreeList/` (all three files)

**Interfaces:**
- Consumes: `useRepoData` (Task 7), `CheckoutCard` (Task 8).
- Produces: nothing new — this task wires existing interfaces together.

- [ ] **Step 1: Rewrite `Project.tsx`**

Replace the entire contents of `src/renderer/components/Project/Project.tsx` with:

```tsx
import { Button, ButtonGroup, Classes, Colors, Icon, Popover } from '@blueprintjs/core';
import { type FC, Fragment, useMemo, useState } from 'react';
import { useGit } from 'renderer/hooks/useGit';
import { useModal } from 'renderer/hooks/useModal';
import { useMountEffect } from 'renderer/hooks/useMountEffect';
import { cn } from 'renderer/utils/cn';
import { type Project as IProject } from 'types/project';
import { type Worktree } from 'types/worktree';

import { GitStatusGroup } from '../GitStatusGroup';
import { CheckoutCard } from './components/CheckoutCard';
import { Error } from './components/Error';
import { ProjectMenu } from './components/ProjectMenu';
import { PullRequest } from './components/PullRequest';
import { QuickActions } from './components/QuickActions';
import { useRepoData } from './hooks/useRepoData';

type Props = {
  project: IProject;
};

export const Project: FC<Props> = ({ project }) => {
  const { getStatus, gitStatus, loading } = useGit();
  const { openModal } = useModal();
  const [pullLoading, setPullLoading] = useState(false);

  const {
    clearHiddenPulls,
    clearHiddenRuns,
    getOrphanPulls,
    hiddenPullCount,
    hiddenRunCount,
    hidePull,
    hideRun,
    pullsByBranch,
    refresh,
    runsByBranch
  } = useRepoData(project);

  const { filePath, groupId, id, name } = project;

  const updateProject = () => {
    refresh();
    getStatus(id);
  };

  const runPull = async () => {
    setPullLoading(true);
    await window.bridge.git.pull(id);
    setPullLoading(false);
    updateProject();
  };

  const removeAlert = () => {
    openModal({
      name: 'remove:project',
      props: { id, name }
    });
  };

  const ignoreWorkflow = (workflowName: string, workflowPath: string) => {
    openModal({ name: 'ignore:workflow', props: { workflowName, workflowPath } });
  };

  useMountEffect(() => {
    getStatus(id, true);
  });

  // A repo always has at least its main worktree. Older status payloads and
  // failed `git worktree list` calls leave it undefined — synthesise it so a
  // zero-worktree repo still renders exactly one card.
  const worktrees: Worktree[] = useMemo(() => {
    if (gitStatus?.worktrees?.length) return gitStatus.worktrees;
    if (!gitStatus?.branchSummary?.current) return [];

    return [{ branch: gitStatus.branchSummary.current, isMain: true, path: filePath }];
  }, [filePath, gitStatus]);

  const orphans = getOrphanPulls(worktrees.map((worktree) => worktree.branch));
  const behind = gitStatus?.status?.behind ?? 0;

  if (gitStatus && !gitStatus.success) {
    return (
      <Error
        name={name}
        removeAlert={removeAlert}
      />
    );
  }

  return (
    <>
      <div
        className={cn(
          'flex relative items-center justify-between min-h-[55px] py-0.5 pl-5 pr-4',
          'bg-bp-light-gray-4 dark:bg-bp-dark-gray-2',
          '[&+&]:mt-0.5'
        )}
      >
        <div className="flex flex-1 items-center justify-between w-full pr-2.5 gap-2.5">
          <div className={cn('flex flex-col', loading && !gitStatus && Classes.SKELETON)}>
            <div className="font-medium">{name}</div>

            <div className="text-[11px] font-light -mt-0.5 dark:text-bp-gray-3">
              {gitStatus?.organization ?? 'Local git'}
            </div>
          </div>

          <GitStatusGroup
            gitStatus={gitStatus}
            name={name}
          />
        </div>

        <QuickActions
          gitStatus={gitStatus}
          onUpdate={updateProject}
          project={project}
        />

        <div
          className={cn(
            'flex relative flex-row-reverse min-w-[79px] ml-auto select-none',
            !gitStatus && Classes.SKELETON
          )}
        >
          <ButtonGroup large>
            {!behind && (
              <Button
                icon="refresh"
                onClick={updateProject}
              />
            )}

            {Boolean(behind) && (
              <Button
                icon="arrow-down"
                intent="warning"
                loading={pullLoading}
                onClick={runPull}
              />
            )}

            <Popover
              content={
                <ProjectMenu
                  clearHiddenPulls={clearHiddenPulls}
                  clearHiddenRuns={clearHiddenRuns}
                  filePath={filePath}
                  getStatus={updateProject}
                  gitStatus={gitStatus}
                  groupId={groupId}
                  hiddenCount={hiddenRunCount}
                  hiddenPullCount={hiddenPullCount}
                  id={id}
                  name={name}
                  pull={runPull}
                  removeProject={removeAlert}
                />
              }
              placement="auto-end"
            >
              <Button
                icon="caret-down"
                intent={behind ? 'warning' : 'none'}
              />
            </Popover>
          </ButtonGroup>

          <Icon
            className={cn(
              'absolute top-1/2 -left-[22px] mr-2.5 -translate-y-1/2 origin-center opacity-0',
              loading && 'animate-[blink_3s_infinite]'
            )}
            color={Colors.ORANGE1}
            icon="dot"
          />
        </div>
      </div>

      {worktrees.map((worktree) => (
        <Fragment key={worktree.path}>
          <CheckoutCard
            gitStatus={worktree.isMain ? gitStatus : undefined}
            onHidePull={hidePull}
            onHideRun={hideRun}
            onIgnoreWorkflow={ignoreWorkflow}
            onRefresh={updateProject}
            project={project}
            pulls={pullsByBranch[worktree.branch] ?? []}
            runs={runsByBranch[worktree.branch] ?? []}
            worktree={worktree}
          />

          {worktree.isMain && orphans.length > 0 && (
            <div className="pl-5">
              {orphans.map(({ pull, tags }) => (
                <PullRequest
                  key={pull.id}
                  onHide={hidePull}
                  projectId={id}
                  pull={pull}
                  tags={tags}
                />
              ))}
            </div>
          )}
        </Fragment>
      ))}
    </>
  );
};
```

**Placement of the orphan pull requests.** They render directly beneath the **main** checkout card — the one with `isMain: true`, which git always lists first — and above the worktree cards. They are deliberately NOT passed into `CheckoutCard` as extra `pulls`, for two reasons: `CheckoutCard` nests a branch's runs under its first pull request, and an orphan's runs belong to a different branch entirely; and they must stay visible regardless of whether the main card is expanded, because they are repo-level information, not that checkout's.

The set is exactly "open pull requests for this repo whose head branch is not checked out in any worktree currently shown" — `orphanPulls` computes it by subtracting every rendered worktree's branch from the branch-keyed pull map.

- [ ] **Step 2: Trim `QuickActions.tsx`**

The worktrees / actions / pulls toggles moved onto the individual cards, and copy-branch belongs to a checkout, not the repo. Replace the entire contents of `src/renderer/components/Project/components/QuickActions/QuickActions.tsx` with:

```tsx
import { Button, ButtonGroup, Classes, Tooltip } from '@blueprintjs/core';
import { type FC } from 'react';
import { useModal } from 'renderer/hooks/useModal';
import { type GitStatus, type Project } from 'types/project';

type Props = {
  gitStatus: GitStatus;
  loading?: boolean;
  onUpdate?: () => void;
  project: Project;
};

export const QuickActions: FC<Props> = ({ gitStatus, loading, onUpdate, project }) => {
  const { openModal } = useModal();

  return (
    <div className="flex gap-2 items-center">
      <ButtonGroup className={!gitStatus && Classes.SKELETON}>
        <Tooltip compact
          content="Add worktree"
          hoverOpenDelay={500}
          placement="bottom"
        >
          <Button
            icon="git-new-branch"
            loading={loading}
            onClick={() =>
              openModal({
                name: 'git:worktree:add',
                props: { gitStatus, id: project.id, name: project.name, onSuccess: onUpdate }
              })
            }
          />
        </Tooltip>
      </ButtonGroup>
    </div>
  );
};
```

- [ ] **Step 3: Delete the superseded code**

```bash
rm -r src/renderer/components/Project/hooks/useActions
rm -r src/renderer/components/Project/hooks/usePulls
rm -r src/renderer/components/Project/components/WorktreeList
```

In `src/main/ipcs/ipcGitHub.ts`, delete the whole `git:api:getAction` handler (lines 58-94 in the original file — the block starting `ipcMain.handle('git:api:getAction'` and ending with its closing `});`).

In `src/preload/index.ts`, delete this line from `gitAPI`:

```ts
    getAction: (id: string, filterBy: string[]) => ipcRenderer.invoke('git:api:getAction', id, filterBy),
```

In `src/renderer/test-setup.ts`, delete `getAction: vi.fn(),` from the `gitAPI` mock.

In `src/main/ipcs/ipcGitHub.test.ts`, delete the `describe('git:api:getAction', …)` block if one exists.

- [ ] **Step 4: Verify**

Run: `pnpm lint && pnpm test`
Expected: PASS — no unresolved imports (nothing should still reference `useActions`, `usePulls`, `WorktreeList`, or `getAction`), full suite green.

Confirm nothing dangles:

```bash
grep -rn "useActions\|usePulls\|WorktreeList\|getAction" src/ || echo "clean"
```

Expected: `clean`.

- [ ] **Step 5: Verify in the running app**

Run: `pnpm dev`

Check by hand, since none of this is covered by automated tests:
1. A repo with no extra worktrees shows exactly one checkout card, on its current branch.
2. Adding a worktree makes a second card appear after a refresh.
3. Expanding a worktree card that has an open PR shows the PR with its runs nested beneath it.
4. A worktree branch with runs but no PR shows the runs directly.
5. A PR on a branch with no worktree appears in the orphan list below the cards.
6. The pull button appears on a card that is behind, and pulling updates that card's badges.

Stop the dev server when done.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/Project/Project.tsx src/renderer/components/Project/components/QuickActions/QuickActions.tsx src/main/ipcs/ipcGitHub.ts src/main/ipcs/ipcGitHub.test.ts src/preload/index.ts src/renderer/test-setup.ts
git add -u src/renderer/components/Project/hooks src/renderer/components/Project/components/WorktreeList
git commit -m "feat: render every worktree as a checkout card with its pulls and runs"
```

---

## Self-Review Notes

- **Spec coverage:** D1 → Tasks 8, 9. D2 → Task 8 (`isMain` gate on `CheckoutBranch`). D3 → Tasks 4, 5, 7. D4 → Task 5. D5 → Task 8 (per-card `expanded`). D6 → Tasks 1, 3. D7 → Task 2 plus the `worktrees` fallback in Task 9. D8 → Task 6 (`groupRunsByBranch` keys on `head_branch`; `pull_requests` is never read).
- **Known behaviour change:** `gitHubActions.count` now caps runs **per branch** rather than per repo. This is intended — a repo-wide cap would starve worktree cards.
- **Known behaviour change:** `gitHubActions.all` no longer affects run fetching, since runs are no longer branch-filtered in the main process. The setting remains in `src/main/settings.ts` and is unused by the new path; removing it from settings UI is out of scope.
- **Not covered by tests:** `useRepoData`, `CheckoutCard`, and `Project` — no renderer test environment exists in this repo. Task 9 Step 5 is the manual verification pass that stands in for it.
