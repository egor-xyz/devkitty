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

/**
 * A repo whose own name matches keeps all of its checkouts — you asked for the
 * repo, not for a branch inside it. Otherwise only matching checkouts survive,
 * plus main: it carries the repo header, so hiding it would strand the rest.
 * An empty result means the repo has nothing to show and drops out entirely.
 */
export const filterWorktrees = (worktrees: Worktree[], query: string, projectMatched: boolean): Worktree[] => {
  if (!query.trim() || projectMatched) return worktrees;

  const hits = worktrees.filter((worktree) => matchesQuery(`${worktree.branch} ${worktree.path}`, query));
  if (hits.length === 0) return [];

  return worktrees.filter((worktree) => worktree.isMain || hits.includes(worktree));
};
