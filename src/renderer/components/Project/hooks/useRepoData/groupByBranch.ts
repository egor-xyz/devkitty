import { type Pull, type Run } from 'types/gitHub';
import { type Worktree } from 'types/worktree';

export type PullWithTags = {
  pull: Pull;
  tags: string[];
};

// A run nobody needs to look at again: it finished and it did not fail.
// Cancelled and timed-out runs stay visible — they usually want a re-run.
const settledConclusions = new Set(['neutral', 'skipped', 'success']);

export const splitDoneRuns = (
  runs: Run[],
  pinnedWorkflows: string[] = []
): { active: Run[]; done: Run[]; pinned: Run[] } => {
  const pinnedPaths = new Set(pinnedWorkflows);
  const active: Run[] = [];
  const done: Run[] = [];
  const pinned: Run[] = [];

  // Pinning a workflow means "keep an eye on this deploy", not "show me every
  // deploy that ever ran": only its newest run is pinned, the earlier ones fall
  // back to the normal buckets and fold away with everything else.
  const latestPinned = new Map<string, Run>();

  for (const run of runs) {
    if (!run.path || !pinnedPaths.has(run.path)) continue;

    const current = latestPinned.get(run.path);
    if (!current || new Date(run.created_at).getTime() > new Date(current.created_at).getTime()) {
      latestPinned.set(run.path, run);
    }
  }

  for (const run of runs) {
    if (run.path && latestPinned.get(run.path)?.id === run.id) {
      pinned.push(run);
    } else if (run.conclusion && settledConclusions.has(run.conclusion)) {
      done.push(run);
    } else {
      active.push(run);
    }
  }

  return { active, done, pinned };
};

// What a checkout shows when opened: each pull request followed by its own
// runs, then any runs that belong to no pull request.
export type DetailGroup = {
  // True when the branch is not checked out in any worktree — shown under the
  // main checkout because it has nowhere else to go.
  orphan?: boolean;
  pull?: PullWithTags;
  runs: Run[];
};

export const buildDetailGroups = (
  pulls: PullWithTags[],
  runsByBranch: Record<string, Run[]>,
  branch: string
): DetailGroup[] => {
  // GitHub's PR UI shows checks for the PR's HEAD commit only — runs from
  // earlier commits on the same branch (a since-superseded failing build, say)
  // are not the PR's current state and must not surface under it. Scope each
  // pull's runs to its head SHA; runs from older commits fall through to the
  // branch's loose bucket (or vanish once the branch view no longer needs them).
  const groups: DetailGroup[] = pulls.map((pull) => {
    const ref = pull.pull.head?.ref;
    const sha = pull.pull.head?.sha;
    const branchRuns = ref ? (runsByBranch[ref] ?? []) : [];
    return {
      pull,
      runs: sha ? branchRuns.filter((run) => run.head_sha === sha) : branchRuns
    };
  });

  const claimed = new Set(pulls.map(({ pull }) => pull.head?.ref));
  const loose = claimed.has(branch) ? [] : (runsByBranch[branch] ?? []);

  return loose.length > 0 ? [...groups, { runs: loose }] : groups;
};

// Runs on a branch that is not checked out anywhere would otherwise render
// nowhere at all, so they collect under the main card beside the orphan pulls.
export const orphanRuns = (runsByBranch: Record<string, Run[]>, branches: string[]): Record<string, Run[]> => {
  const owned = new Set(branches);
  const orphaned: Record<string, Run[]> = Object.create(null);

  for (const [branch, runs] of Object.entries(runsByBranch)) {
    if (owned.has(branch) || runs.length === 0) continue;

    orphaned[branch] = runs;
  }

  return orphaned;
};

// A checkout whose only pull requests are merged or closed has nothing left to
// do — it sinks to the bottom of the list and is marked as finished.
export const isSettledPull = ({ pull }: PullWithTags) => Boolean(pull.merged_at) || pull.state === 'closed';

export const isCheckoutDone = (pulls: PullWithTags[] = []) => pulls.length > 0 && pulls.every(isSettledPull);

const stamp = (value?: null | string) => {
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isNaN(time) ? 0 : time;
};

// Most recently active checkout first, measured across both its CI runs and its
// pull requests. The main checkout is exempt: it is the repo header, and the
// repo's orphan pull requests are anchored beneath it.
export const lastActivityAt = (
  branch: string,
  runsByBranch: Record<string, Run[]>,
  pullsByBranch: Record<string, PullWithTags[]>
): number => {
  const times = [
    ...(runsByBranch[branch] ?? []).map((run) => Math.max(stamp(run.updated_at), stamp(run.created_at))),
    ...(pullsByBranch[branch] ?? []).map(({ pull }) => Math.max(stamp(pull.updated_at), stamp(pull.created_at)))
  ];

  return times.length > 0 ? Math.max(...times) : 0;
};

export const sortWorktreesByActivity = (
  worktrees: Worktree[],
  runsByBranch: Record<string, Run[]>,
  pullsByBranch: Record<string, PullWithTags[]>
): Worktree[] =>
  [...worktrees].sort((a, b) => {
    if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;

    const aDone = isCheckoutDone(pullsByBranch[a.branch]);
    const bDone = isCheckoutDone(pullsByBranch[b.branch]);
    if (aDone !== bDone) return aDone ? 1 : -1;

    return lastActivityAt(b.branch, runsByBranch, pullsByBranch) - lastActivityAt(a.branch, runsByBranch, pullsByBranch);
  });

// Beyond this many rows in one list the card stops being scannable, so the
// tail folds away behind a "show more" the same way finished checks do.
export const overflowLimit = 10;

/**
 * Splits a list into what stays on screen and what hides behind a toggle.
 * A list at or under the limit hides nothing — one extra row is not worth a
 * divider.
 */
export const splitOverflow = <T,>(items: T[], limit = overflowLimit): { hidden: T[]; visible: T[] } =>
  items.length <= limit ? { hidden: [], visible: items } : { hidden: items.slice(limit), visible: items.slice(0, limit) };

const dayMs = 86400000;

/**
 * A poll only sees the newest page of a repo's runs, and a busy repo pushes a
 * branch off that page within the hour. Merging each poll into what is already
 * on screen keeps a checkout's runs visible for the full 24h window instead of
 * blinking out as soon as the repo gets loud. Fresh copies win, so a run that
 * finished between polls updates in place.
 */
export const mergeRuns = (previous: Run[], incoming: Run[], now: number): Run[] => {
  const byId = new Map<number, Run>();

  for (const run of previous) byId.set(run.id, run);
  for (const run of incoming) byId.set(run.id, run);

  return [...byId.values()].filter((run) => new Date(run.created_at).getTime() > now - dayMs);
};

// A pull request's checks pass all day long; only a failure is worth a desktop
// notification. Runs off a pull request — a deploy, a push to main — still
// report both ways, since nobody is watching a pull request page for those.
const failedConclusions = new Set(['action_required', 'cancelled', 'failure', 'startup_failure', 'timed_out']);

export const isPullRun = (event?: null | string) => event === 'pull_request' || event === 'pull_request_target';

export const shouldNotifyRun = (run: Run, hidden = false): boolean => {
  if (!run.conclusion) return false;
  // A hidden workflow is still fetched — the cards offer a peek at it — but it
  // has no business interrupting anyone. Whether it counts as hidden depends on
  // where the run would render, so the caller decides with the run's context.
  if (hidden) return false;

  return isPullRun(run.event) ? failedConclusions.has(run.conclusion) : true;
};

// Runs are fetched for the whole repo, so every branch every teammate pushes
// lands in the poll. Only what this machine has checked out — plus the pull
// requests you opened yourself — deserves a desktop notification; the rest is
// somebody else's CI and reads as spam.
export const notifiableBranches = (worktreeBranches: string[], pulls: PullWithTags[]): Set<string> => {
  const branches = new Set(worktreeBranches);

  for (const { pull, tags } of pulls) {
    if (tags.includes('My') && pull.head?.ref) branches.add(pull.head.ref);
  }

  return branches;
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
  const grouped: Record<string, PullWithTags[]> = Object.create(null);

  for (const item of pulls) {
    const branch = item.pull.head?.ref;
    if (!branch) continue;

    grouped[branch] = grouped[branch] ?? [];
    grouped[branch].push(item);
  }

  return grouped;
};

// `countPerBranch` caps how many runs a branch keeps; left out, it keeps them
// all and the card decides what to show.
// When a workflow is re-run, GitHub creates a fresh run record for the same
// workflow on the same commit. GitHub's own PR UI shows only the latest attempt
// and hides the superseded ones — otherwise a stale failed attempt keeps a red X
// on a workflow that has since passed. Collapse each (workflow, commit) to its
// newest attempt so the card matches GitHub. Keyed on head_sha (not head_branch)
// so genuinely different commits on a branch stay as distinct rows.
export const dedupeSupersededRuns = (runs: Run[]): Run[] => {
  const latest = new Map<string, Run>();

  for (const run of runs) {
    const workflow = run.path ?? (run.workflow_id == null ? '' : String(run.workflow_id));
    // Only collapse when a run carries a stable (workflow, commit) identity;
    // without both, treat it as unique (keyed by id) so nothing is dropped.
    const key = run.head_sha && workflow ? `${workflow}|${run.head_sha}` : `id:${run.id}`;
    const current = latest.get(key);
    if (!current) {
      latest.set(key, run);
      continue;
    }
    // Prefer the higher run_attempt, falling back to the newer created_at.
    const isNewer =
      (run.run_attempt ?? 0) > (current.run_attempt ?? 0) ||
      ((run.run_attempt ?? 0) === (current.run_attempt ?? 0) &&
        new Date(run.created_at).getTime() > new Date(current.created_at).getTime());
    if (isNewer) latest.set(key, run);
  }

  return [...latest.values()];
};

export const groupRunsByBranch = (runs: Run[], countPerBranch?: number): Record<string, Run[]> => {
  const grouped: Record<string, Run[]> = Object.create(null);

  for (const run of dedupeSupersededRuns(runs)) {
    const branch = run.head_branch;
    if (!branch) continue;

    grouped[branch] = grouped[branch] ?? [];
    grouped[branch].push(run);
  }

  for (const branch of Object.keys(grouped)) {
    const sorted = grouped[branch].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    grouped[branch] = countPerBranch === undefined ? sorted : sorted.slice(0, countPerBranch);
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
