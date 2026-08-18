import { type PullWithTags } from 'renderer/components/Project/hooks/useRepoData/groupByBranch';
import { type Run } from 'types/gitHub';
import { type Worktree } from 'types/worktree';

/**
 * Every whitespace-separated term has to appear somewhere in the value, so
 * `hero dark` finds `HERO-7901/dark-mode-preview` without caring about order.
 */
export const matchesQuery = (value: string, query: string): boolean => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const haystack = value.toLowerCase();

  return terms.every((term) => haystack.includes(term));
};

// Three names are searchable, and nothing else: the branch, the workflow, the
// pull request title. Commit subjects and authors would match half the repo.
export const runMatches = (run: Run, query: string) => matchesQuery(run.name ?? '', query);

export const pullMatches = ({ pull }: PullWithTags, query: string) => matchesQuery(pull.title ?? '', query);

/**
 * Everything searchable about a checkout in one string, used to decide whether
 * the checkout appears at all. Typing "staging" keeps the checkout running a
 * Staging Deployment, not just branches with the word in their name.
 */
export const worktreeHaystack = (worktree: Worktree, runs: Run[] = [], pulls: PullWithTags[] = []): string =>
  [worktree.branch, ...runs.map((run) => run.name ?? ''), ...pulls.map(({ pull }) => pull.title ?? '')].join(' ');

/**
 * A repo whose own name matches keeps all of its checkouts — you asked for the
 * repo, not for a branch inside it. Otherwise only matching checkouts survive,
 * plus main: it carries the repo header, so hiding it would strand the rest.
 * An empty result means the repo has nothing to show and drops out entirely.
 */
export const filterWorktrees = (
  worktrees: Worktree[],
  query: string,
  projectMatched: boolean,
  haystack: (worktree: Worktree) => string = (worktree) => worktree.branch
): Worktree[] => {
  if (!query.trim() || projectMatched) return worktrees;

  const hits = worktrees.filter((worktree) => matchesQuery(haystack(worktree), query));
  if (hits.length === 0) return [];

  return worktrees.filter((worktree) => worktree.isMain || hits.includes(worktree));
};

type Group<TPull, TRun> = { pull?: TPull; runs: TRun[] };

/**
 * Narrows what a matched checkout shows. A checkout kept because its own branch
 * matched keeps everything; one kept because something inside it matched shows
 * only that — the matching runs, and the pull request they belong to.
 */
export const filterGroups = <TGroup extends Group<PullWithTags, Run>>(
  groups: TGroup[],
  query: string,
  branchMatched: boolean
): TGroup[] => {
  if (!query.trim() || branchMatched) return groups;

  return groups
    .map((group) => {
      if (group.pull && pullMatches(group.pull, query)) return group;

      return { ...group, runs: group.runs.filter((run) => runMatches(run, query)) };
    })
    .filter((group) => group.runs.length > 0 || (group.pull && pullMatches(group.pull, query)));
};
