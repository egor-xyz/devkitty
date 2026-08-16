import { type Pull, type Run } from 'types/gitHub';
import { type Worktree } from 'types/worktree';

export type PullWithTags = {
  pull: Pull;
  tags: string[];
};

// A run nobody needs to look at again: it finished and it did not fail.
// Cancelled and timed-out runs stay visible — they usually want a re-run.
const settledConclusions = new Set(['neutral', 'skipped', 'success']);

export const splitDoneRuns = (runs: Run[]): { active: Run[]; done: Run[] } => {
  const active: Run[] = [];
  const done: Run[] = [];

  for (const run of runs) {
    if (run.conclusion && settledConclusions.has(run.conclusion)) {
      done.push(run);
    } else {
      active.push(run);
    }
  }

  return { active, done };
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
  const groups: DetailGroup[] = pulls.map((pull) => ({
    pull,
    runs: pull.pull.head?.ref ? (runsByBranch[pull.pull.head.ref] ?? []) : []
  }));

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

export const groupRunsByBranch = (runs: Run[], countPerBranch: number): Record<string, Run[]> => {
  const grouped: Record<string, Run[]> = Object.create(null);

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
