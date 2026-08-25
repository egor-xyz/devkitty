import { describe, expect, it } from 'vitest';

import {
  addScope,
  type IgnoredWorkflow,
  isWorkflowHidden,
  parseIgnored,
  removeScope,
  type RunContext,
  scopeLabel,
  scopeMatches
} from './ignoredWorkflows';

describe('parseIgnored', () => {
  it('should return nothing for a non-array', () => {
    expect(parseIgnored(null)).toEqual([]);
    expect(parseIgnored('nope')).toEqual([]);
  });

  it('should migrate legacy bare paths to hide everywhere', () => {
    expect(parseIgnored(['.github/workflows/ci.yml'])).toEqual([
      { path: '.github/workflows/ci.yml', scopes: ['all'] }
    ]);
  });

  it('should migrate a scopeless object to hide everywhere', () => {
    expect(parseIgnored([{ path: 'a.yml' }])).toEqual([{ path: 'a.yml', scopes: ['all'] }]);
  });

  it('should keep valid scopes and drop invalid ones', () => {
    expect(parseIgnored([{ path: 'a.yml', scopes: ['root', 'bogus', 'pr'] }])).toEqual([
      { path: 'a.yml', scopes: ['root', 'pr'] }
    ]);
  });

  it('should fall back to all when every stored scope is invalid', () => {
    expect(parseIgnored([{ path: 'a.yml', scopes: ['bogus'] }])).toEqual([{ path: 'a.yml', scopes: ['all'] }]);
  });

  it('should merge duplicate paths into one entry', () => {
    expect(parseIgnored([{ path: 'a.yml', scopes: ['root'] }, { path: 'a.yml', scopes: ['pr'] }])).toEqual([
      { path: 'a.yml', scopes: ['root', 'pr'] }
    ]);
  });

  it('should order scopes canonically regardless of input order', () => {
    expect(parseIgnored([{ path: 'a.yml', scopes: ['pr', 'root', 'worktree'] }])[0].scopes).toEqual([
      'root',
      'worktree',
      'pr'
    ]);
  });
});

describe('scopeMatches', () => {
  const rootPush: RunContext = { isPr: false, isRoot: true };
  const worktreePush: RunContext = { isPr: false, isRoot: false };
  const rootPr: RunContext = { isPr: true, isRoot: true };
  const worktreePr: RunContext = { isPr: true, isRoot: false };

  it('all should match every context', () => {
    for (const ctx of [rootPush, worktreePush, rootPr, worktreePr]) {
      expect(scopeMatches('all', ctx)).toBe(true);
    }
  });

  it('root should match only non-PR runs on the main card', () => {
    expect(scopeMatches('root', rootPush)).toBe(true);
    expect(scopeMatches('root', rootPr)).toBe(false);
    expect(scopeMatches('root', worktreePush)).toBe(false);
  });

  it('worktree should match only non-PR runs on a worktree card', () => {
    expect(scopeMatches('worktree', worktreePush)).toBe(true);
    expect(scopeMatches('worktree', worktreePr)).toBe(false);
    expect(scopeMatches('worktree', rootPush)).toBe(false);
  });

  it('pr should match any pull-request run, root or worktree', () => {
    expect(scopeMatches('pr', rootPr)).toBe(true);
    expect(scopeMatches('pr', worktreePr)).toBe(true);
    expect(scopeMatches('pr', rootPush)).toBe(false);
  });

  it('non-pr should match any non-PR run, root or worktree', () => {
    expect(scopeMatches('non-pr', rootPush)).toBe(true);
    expect(scopeMatches('non-pr', worktreePush)).toBe(true);
    expect(scopeMatches('non-pr', worktreePr)).toBe(false);
  });
});

describe('isWorkflowHidden', () => {
  const entries: IgnoredWorkflow[] = [{ path: 'a.yml', scopes: ['worktree'] }];

  it('should hide the worktree push run but not the worktree PR run', () => {
    expect(isWorkflowHidden(entries, { isPr: false, isRoot: false, path: 'a.yml' })).toBe(true);
    // The exact bug: hiding on worktrees must leave PR checks visible.
    expect(isWorkflowHidden(entries, { isPr: true, isRoot: false, path: 'a.yml' })).toBe(false);
  });

  it('should not hide a run whose path is not listed', () => {
    expect(isWorkflowHidden(entries, { isPr: false, isRoot: false, path: 'b.yml' })).toBe(false);
  });

  it('should never hide a run with no path', () => {
    expect(isWorkflowHidden([{ path: '', scopes: ['all'] }], { isPr: false, isRoot: false, path: null })).toBe(false);
  });
});

describe('addScope', () => {
  it('should add a new workflow', () => {
    expect(addScope([], 'a.yml', 'root')).toEqual([{ path: 'a.yml', scopes: ['root'] }]);
  });

  it('should add a scope to an existing workflow in canonical order', () => {
    expect(addScope([{ path: 'a.yml', scopes: ['pr'] }], 'a.yml', 'root')).toEqual([
      { path: 'a.yml', scopes: ['root', 'pr'] }
    ]);
  });

  it('should be a no-op when the scope is already present', () => {
    const entries: IgnoredWorkflow[] = [{ path: 'a.yml', scopes: ['root'] }];
    expect(addScope(entries, 'a.yml', 'root')).toBe(entries);
  });
});

describe('removeScope', () => {
  it('should drop just the one scope', () => {
    expect(removeScope([{ path: 'a.yml', scopes: ['root', 'pr'] }], 'a.yml', 'root')).toEqual([
      { path: 'a.yml', scopes: ['pr'] }
    ]);
  });

  it('should remove the whole workflow when its last scope goes', () => {
    expect(removeScope([{ path: 'a.yml', scopes: ['root'] }], 'a.yml', 'root')).toEqual([]);
  });
});

describe('scopeLabel', () => {
  it('should name every scope', () => {
    expect(scopeLabel('all')).toBe('Everywhere');
    expect(scopeLabel('root')).toBe('main');
    expect(scopeLabel('worktree')).toBe('worktrees');
    expect(scopeLabel('pr')).toBe('Pull requests');
    expect(scopeLabel('non-pr')).toBe('Non-PR');
  });
});
