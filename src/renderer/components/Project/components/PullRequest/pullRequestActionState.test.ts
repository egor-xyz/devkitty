import { describe, expect, it } from 'vitest';

import { getPullRequestActionState } from './pullRequestActionState';

describe('getPullRequestActionState', () => {
  const open = { autoMergeEnabled: false, behind: false, isOpen: true } as const;

  it('shows Update branch while the PR is behind', () => {
    expect(getPullRequestActionState({ ...open, behind: true, mergeableState: 'blocked' })).toMatchObject({
      blocked: false,
      update: true
    });
  });

  it('shows Checking merge while GitHub recomputes mergeability', () => {
    expect(getPullRequestActionState({ ...open, mergeableState: 'unknown' })).toMatchObject({
      blocked: false,
      recomputing: true
    });
  });

  it('restores Merge when GitHub reports a clean PR', () => {
    expect(getPullRequestActionState({ ...open, mergeableState: 'clean' })).toMatchObject({
      blocked: false,
      merge: true
    });
  });

  it('keeps a stable blocked status for an open PR', () => {
    expect(getPullRequestActionState({ ...open, mergeableState: 'blocked' })).toEqual({
      autoMerge: false,
      blocked: true,
      conflicts: false,
      merge: false,
      recomputing: false,
      update: false
    });
  });
});
