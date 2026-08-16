import { describe, expect, it } from 'vitest';

import { filterWorktrees, matchesQuery } from './filter';

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

  it('should match on the worktree path too', () => {
    const result = filterWorktrees([wt('main', true), wt('renamed')], '/repo/renamed', false);

    expect(result.map((worktree) => worktree.branch)).toEqual(['main', 'renamed']);
  });

  it('should return nothing when no worktree matches', () => {
    expect(filterWorktrees(worktrees, 'absent', false)).toEqual([]);
  });

  it('should keep main alone when only main matches', () => {
    const result = filterWorktrees(worktrees, 'main', false);

    expect(result.map((worktree) => worktree.branch)).toEqual(['main']);
  });
});
