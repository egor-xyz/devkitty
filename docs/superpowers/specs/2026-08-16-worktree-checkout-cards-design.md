# Worktree Checkout Cards — Design

**Date:** 2026-08-16
**Status:** Approved

## Problem

The `Project` card conflates two different concepts:

1. **Repo identity** — name, organization, remote, group membership, "remove project".
2. **Checkout state** — current branch, ahead/behind, uncommitted files, GitHub Actions runs, pull requests, "open in editor/terminal".

Git worktrees make the second concept plural. A repo can have many checkouts at once, each on its own branch, each with its own CI runs and its own pull request. The current UI models this as a flat afterthought: a collapsible `WorktreeList` of thin rows below the card, showing only branch, path, status badges, and three buttons. Worktrees have no access to the actions and pull-request data that makes the main card useful.

Consequences in the code today:

- `getGit(id)` always resolves to the project's root `filePath` (`src/main/libs/git.ts:6-20`). `git:pull`, `git:checkout`, `git:reset`, `git:mergeTo` therefore cannot target a worktree at all.
- `useActions` fetches runs filtered to the main checkout's current branch only (`useActions.tsx:43-47`). Worktree branches never appear.
- `usePulls` fetches via `search.issuesAndPullRequests` (`ipcGitHub.ts:191-193`), whose response items carry **no head ref**. Nothing in the app can match a pull request to a branch.
- Workflow runs and pull requests are never cross-referenced. `run.pull_requests` is not referenced anywhere in the repo.

## Solution

A worktree **is** a checkout, and the main repo checkout is simply the worktree with `isMain: true`. Model both with one component.

The repo row becomes a thin identity header. Below it, one **checkout card** per worktree — the main worktree first. Each checkout card owns its branch, its git status, its pull request, and its CI runs. Runs nest under the pull request for their branch when one exists; otherwise they sit directly under the checkout.

```
▸ devkitty                          org: egor-xyz   [+worktree] [⋯]
  │
  ├─ ⌂ main                    ~/my/devkitty        0↑ 0↓  [term][ide][⋯]
  │     ⚙ CI · push · 2m ago                              ✓
  │
  ├─ 🌿 feat/worktree-ui       ~/my/devkitty-feat…  3↑ 0↓  [term][ide][⋯]
  │   └─ PR #42  Worktree UI            ✓ 4/4   [globe][cancel][rerun][⋯]
  │        ⚙ CI · pull_request · 5m ago               ● running
  │
  └─ 🌿 fix/stale-icon         ~/my/devkitty-fix…   0↑ 2↓  [term][ide][⋯]
        ⚙ CI · push · 12m ago                        ✗ failed
```

The association the UI needs falls out of data that already exists: `Run.head_branch` and `Pull.head.ref` are both branch names, and a worktree owns exactly one branch. No new linking concept is introduced.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | Main worktree renders as the first checkout card, same component as the others. Repo header keeps only name, org, add-worktree, and the project menu. | One component, one code path. Avoids two divergent implementations of the same row. |
| D2 | `CheckoutBranch` (branch switcher) appears only on the main checkout card. | A worktree *is* a branch — checkout is meaningless there. The main checkout still needs it for the no-worktree workflow. `CheckoutBranch.tsx:28-38` already guards against checking out a branch held by a worktree. |
| D3 | Runs and pulls are fetched **once per repo** and distributed to cards by branch. | `listWorkflowRunsForRepo` is already repo-wide and unfiltered (`ipcGitHub.ts:66-69`). Per-card fetching would issue N identical calls per 10s poll. |
| D4 | Pull requests come from `rest.pulls.list({state:'open'})`, which returns `head.ref`. The existing `search.issuesAndPullRequests` calls are kept solely to tag which pulls are "My" / "Review requested". | The search API cannot supply a head ref, so nothing can be matched to a branch without this change. `pulls.list` also surfaces PRs opened by other people on a branch you have checked out. |
| D5 | Actions and pulls expand per checkout card, not per repo. | The point of nesting is per-worktree attention; a repo-wide toggle flattens it back out. |
| D6 | Only `pull` gains worktree-path support in v1. `merge`, `reset`, `checkout` do not. | Pull is the operation the behind-count badge already invites. Merge and reset are destructive and conflict-prone; defer until the rest is stable. |
| D7 | A repo with no extra worktrees shows exactly one checkout card and looks like today. | Zero-worktree repos must not regress. |
| D8 | Run → PR association matches on branch (`run.head_branch === pull.head.ref`). `run.pull_requests[]` is not used. | `pull_requests[]` is empty for fork PRs and unreliable across event types. |

## Architecture

### Main process

| Change | File | Notes |
|---|---|---|
| `getWorktreeGit(id, worktreePath)` | `src/main/libs/git.ts` | Returns a `simpleGit` bound to a worktree path, after verifying the path appears in that project's `git worktree list`. The verification prevents an arbitrary renderer-supplied path from being operated on. |
| `git:getStatus` always returns `worktrees` | `src/main/ipcs/ipcGit.ts:33-35` | The `parsed.length > 1` guard is removed so single-worktree repos also report their main worktree. The new UI renders from this array. |
| `git:worktree:pull` | `src/main/ipcs/ipcWorktree.ts` | New handler, `(id, worktreePath)`, uses `getWorktreeGit`. |
| `git:api:getRuns` | `src/main/ipcs/ipcGitHub.ts` | New handler, `(id)`. Same time-window, `inProgress`, and `ignoredWorkflows` filtering as `git:api:getAction`, but **no branch filter and no count slice** — the renderer slices per branch. |
| `git:api:getOpenPulls` | `src/main/ipcs/ipcGitHub.ts` | New handler, `(id)`, calls `rest.pulls.list({owner, repo, per_page: 100, state: 'open'})`. |
| `git:api:getAction` removed | `src/main/ipcs/ipcGitHub.ts:58-94` | Superseded by `git:api:getRuns` once the renderer is rewired. |

### Renderer

| Unit | File | Responsibility |
|---|---|---|
| `groupByBranch` | `src/renderer/components/Project/hooks/useRepoData/groupByBranch.ts` | Pure functions: `tagPulls`, `groupPullsByBranch`, `groupRunsByBranch`. No React, no bridge — fully unit-testable. |
| `useRepoData` | `src/renderer/components/Project/hooks/useRepoData/useRepoData.tsx` | One fetch + poll cycle per repo for runs and pulls. Returns branch-keyed records plus hidden-item state. Replaces `useActions` and `usePulls`. |
| `CheckoutCard` | `src/renderer/components/Project/components/CheckoutCard/CheckoutCard.tsx` | One worktree: header row (branch, path, status badges, per-card buttons) plus its pull request and runs. Replaces `WorktreeRow`. |
| `Project` | `src/renderer/components/Project/Project.tsx` | Repo shell: identity, project menu, add-worktree, and a list of `CheckoutCard`s. |

Deleted once rewiring lands: `hooks/useActions/`, `hooks/usePulls/`, `components/WorktreeList/`.

### Data flow

```
Project (repo shell)
  ├─ useGit().getStatus(id) ──────────► gitStatus.worktrees: Worktree[]
  └─ useRepoData(project) ────────────► bridge.gitAPI.getRuns(id)        [poll: fetchInterval]
                                        bridge.gitAPI.getOpenPulls(id)   [poll: gitHubPulls.pollInterval]
                                        bridge.gitAPI.getPulls(id, …)    [tagging only]
                                          │
                                          ├─ groupRunsByBranch  → runsByBranch[branch]
                                          └─ groupPullsByBranch → pullsByBranch[branch]
                                                │
        for each worktree ──► CheckoutCard(worktree, runs=runsByBranch[wt.branch],
                                                     pulls=pullsByBranch[wt.branch])
```

Pull requests whose `head.ref` matches no worktree render in a collapsed section on the repo shell, so PRs opened from another machine are not lost.

### Testing

The project has no `@testing-library/react` and runs vitest in the default node environment (`vitest.config.ts`), so component rendering is not testable here. All new logic that warrants a test — branch grouping, tagging, run/PR attachment, IPC handlers — is therefore placed in pure modules or main-process handlers, matching the existing `handlers[channel]` pattern in `src/main/ipcs/*.test.ts`.

## Out of scope

- Worktree-scoped `merge`, `reset`, `checkout` (D6).
- Creating a pull request from the app.
- Persisting worktree metadata in `electron-store` — worktrees stay derived from `git worktree list`.
- Reordering or grouping worktrees.
