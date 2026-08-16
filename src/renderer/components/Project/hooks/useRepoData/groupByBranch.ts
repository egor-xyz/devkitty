import { type Pull, type Run } from 'types/gitHub';
import { type Worktree } from 'types/worktree';

export type PullWithTags = {
  pull: Pull;
  tags: string[];
};

// A checkout with an open pull request is the most likely thing you came here
// to look at, one with CI runs the next. The main checkout is exempt: it stays
// first because the repo's orphan pull requests are anchored beneath it.
export const sortWorktreesByActivity = (
  worktrees: Worktree[],
  runsByBranch: Record<string, Run[]>,
  pullsByBranch: Record<string, PullWithTags[]>
): Worktree[] => {
  const activity = ({ branch }: Worktree) =>
    ((pullsByBranch[branch]?.length ?? 0) > 0 ? 2 : 0) + ((runsByBranch[branch]?.length ?? 0) > 0 ? 1 : 0);

  return [...worktrees].sort((a, b) => {
    if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;

    return activity(b) - activity(a);
  });
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
