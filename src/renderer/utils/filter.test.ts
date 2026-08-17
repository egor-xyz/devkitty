import { describe, expect, it } from 'vitest';

import { filterGroups, filterWorktrees, matchesQuery, worktreeHaystack } from './filter';

const wt = (branch: string, isMain = false) => ({ branch, isMain, path: `/repo/${branch}` });

describe('matchesQuery', () => {
  it('should match everything when the query is empty', () => {
    expect(matchesQuery('anything', '')).toBe(true);
  });

  it('should match everything when the query is only whitespace', () => {
    expect(matchesQuery('anything', '   ')).toBe(true);
  });

  it('should ignore case', () => {
    expect(matchesQuery('HERO-7901/dark-mode', 'hero-7901')).toBe(true);
  });

  it('should require every term regardless of order', () => {
    expect(matchesQuery('HERO-7901/dark-mode-preview', 'dark hero')).toBe(true);
  });

  it('should fail when one term is missing', () => {
    expect(matchesQuery('HERO-7901/dark-mode-preview', 'dark lime')).toBe(false);
  });
});

describe('filterWorktrees', () => {
  const worktrees = [wt('main', true), wt('HERO-7901/dark-mode-preview'), wt('feature/search')];

  it('should return every worktree for an empty query', () => {
    expect(filterWorktrees(worktrees, '', false)).toHaveLength(3);
  });

  it('should return every worktree when the project itself matched', () => {
    expect(filterWorktrees(worktrees, 'nothing-here', true)).toHaveLength(3);
  });

  it('should keep matching worktrees and main', () => {
    const result = filterWorktrees(worktrees, 'dark', false);

    expect(result.map((worktree) => worktree.branch)).toEqual(['main', 'HERO-7901/dark-mode-preview']);
  });

  it('should not match on the worktree path', () => {
    expect(filterWorktrees([wt('main', true), wt('renamed')], '/repo/renamed', false)).toEqual([]);
  });

  it('should return nothing when no worktree matches', () => {
    expect(filterWorktrees(worktrees, 'absent', false)).toEqual([]);
  });

  it('should keep main alone when only main matches', () => {
    const result = filterWorktrees(worktrees, 'main', false);

    expect(result.map((worktree) => worktree.branch)).toEqual(['main']);
  });
});

describe('worktreeHaystack', () => {
  const main = wt('main', true);

  it('should include the branch', () => {
    expect(worktreeHaystack(main)).toContain('main');
  });

  it('should leave the path out', () => {
    expect(worktreeHaystack(main)).not.toContain('/repo/');
  });

  it('should include workflow names so a run can be searched for', () => {
    const runs = [{ display_title: 'chore: bump', head_branch: 'main', name: 'Staging Deployment' }] as any;

    expect(matchesQuery(worktreeHaystack(main, runs), 'staging')).toBe(true);
  });

  it('should leave the commit subject out', () => {
    const runs = [{ display_title: 'chore: bump', head_branch: 'main', name: 'Staging Deployment' }] as any;

    expect(matchesQuery(worktreeHaystack(main, runs), 'bump')).toBe(false);
  });

  it('should include pull request titles and numbers', () => {
    const pulls = [{ pull: { number: 42, title: 'fix(ui): dark mode', user: { login: 'egor-xyz' } }, tags: [] }] as any;

    expect(matchesQuery(worktreeHaystack(main, [], pulls), 'dark mode')).toBe(true);
    expect(matchesQuery(worktreeHaystack(main, [], pulls), 'egor-xyz')).toBe(false);
  });

  it('should not match text that appears nowhere', () => {
    expect(matchesQuery(worktreeHaystack(main), 'staging')).toBe(false);
  });
});

describe('filterWorktrees — custom haystack', () => {
  it('should keep a checkout whose runs match even when its branch does not', () => {
    const worktrees = [wt('main', true), wt('feature')];
    const haystack = (worktree: { branch: string }) =>
      worktree.branch === 'feature' ? 'feature Staging Deployment' : worktree.branch;

    const result = filterWorktrees(worktrees, 'staging', false, haystack);

    expect(result.map((worktree) => worktree.branch)).toEqual(['main', 'feature']);
  });
});

describe('filterGroups', () => {
  const run = (name: string) => ({ id: name.length, name }) as any;
  const pullOf = (title: string) => ({ pull: { id: 1, number: 1, title }, tags: [] }) as any;

  it('should keep everything when the branch itself matched', () => {
    const groups = [{ pull: pullOf('unrelated'), runs: [run('Unit Tests')] }];

    expect(filterGroups(groups, 'staging', true)).toEqual(groups);
  });

  it('should keep everything when the query is empty', () => {
    const groups = [{ runs: [run('Unit Tests')] }];

    expect(filterGroups(groups, '  ', false)).toEqual(groups);
  });

  it('should keep only the runs whose workflow name matches', () => {
    const groups = [{ runs: [run('Staging Deployment'), run('Unit Tests')] }];

    const result = filterGroups(groups, 'staging', false);

    expect(result[0].runs.map((item) => item.name)).toEqual(['Staging Deployment']);
  });

  it('should keep a whole group when its pull request title matches', () => {
    const groups = [{ pull: pullOf('fix: staging config'), runs: [run('Unit Tests')] }];

    const result = filterGroups(groups, 'staging', false);

    expect(result[0].runs).toHaveLength(1);
  });

  it('should drop a group where neither the pull request nor any run matches', () => {
    const groups = [{ pull: pullOf('unrelated'), runs: [run('Unit Tests')] }];

    expect(filterGroups(groups, 'staging', false)).toEqual([]);
  });
});
