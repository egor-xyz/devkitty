import { describe, expect, it } from 'vitest';

import {
  buildDetailGroups,
  groupPullsByBranch,
  groupRunsByBranch,
  isCheckoutDone,
  mergeRuns,
  notifiableBranches,
  orphanPulls,
  orphanRuns,
  sortWorktreesByActivity,
  splitDoneRuns,
  splitOverflow,
  tagPulls
} from './groupByBranch';

const pull = (id: number, number: number, ref: string) => ({ head: { ref }, id, number }) as any;
const run = (id: number, branch: string, createdAt: string) =>
  ({ created_at: createdAt, head_branch: branch, id }) as any;

describe('tagPulls', () => {
  it('should tag authored pulls as My', () => {
    const result = tagPulls([pull(1, 42, 'feature')], [42], []);

    expect(result).toEqual([{ pull: pull(1, 42, 'feature'), tags: ['My'] }]);
  });

  it('should tag review-requested pulls', () => {
    const result = tagPulls([pull(1, 42, 'feature')], [], [42]);

    expect(result[0].tags).toEqual(['Review requested']);
  });

  it('should apply both tags to the same pull', () => {
    const result = tagPulls([pull(1, 42, 'feature')], [42], [42]);

    expect(result[0].tags).toEqual(['My', 'Review requested']);
  });

  it('should leave untagged pulls with an empty tag list', () => {
    const result = tagPulls([pull(1, 42, 'feature')], [99], [98]);

    expect(result[0].tags).toEqual([]);
  });

  it('should return an empty array for an empty input array', () => {
    expect(tagPulls([], [], [])).toEqual([]);
  });
});

describe('groupPullsByBranch', () => {
  it('should key pulls by their head ref', () => {
    const items = tagPulls([pull(1, 42, 'feature'), pull(2, 43, 'fix')], [], []);

    const result = groupPullsByBranch(items);

    expect(Object.keys(result).sort()).toEqual(['feature', 'fix']);
    expect(result.feature).toHaveLength(1);
    expect(result.feature[0].pull.number).toBe(42);
  });

  it('should collect multiple pulls on the same branch', () => {
    const items = tagPulls([pull(1, 42, 'feature'), pull(2, 44, 'feature')], [], []);

    const result = groupPullsByBranch(items);

    expect(result.feature).toHaveLength(2);
  });

  it('should skip pulls without a head ref', () => {
    const result = groupPullsByBranch([{ pull: { id: 1, number: 42 } as any, tags: [] }]);

    expect(result).toEqual({});
  });

  it('should return an empty object for an empty input array', () => {
    expect(groupPullsByBranch([])).toEqual({});
  });

  it('should group a branch named __proto__ without throwing', () => {
    const items = tagPulls([pull(1, 42, '__proto__')], [], []);

    expect(() => groupPullsByBranch(items)).not.toThrow();

    const result = groupPullsByBranch(items);
    expect(result.__proto__).toHaveLength(1);
    expect(result.__proto__[0].pull.number).toBe(42);
  });

  it('should group a branch named constructor without throwing', () => {
    const items = tagPulls([pull(1, 42, 'constructor')], [], []);

    expect(() => groupPullsByBranch(items)).not.toThrow();

    const result = groupPullsByBranch(items);
    // eslint-disable-next-line dot-notation -- dot access resolves to Object.prototype.constructor's type
    expect(result['constructor']).toHaveLength(1);
    // eslint-disable-next-line dot-notation -- as above
    expect(result['constructor'][0].pull.number).toBe(42);
  });
});

describe('groupRunsByBranch', () => {
  it('should key runs by head_branch', () => {
    const runs = [run(1, 'main', '2026-08-16T10:00:00Z'), run(2, 'feature', '2026-08-16T10:00:00Z')];

    const result = groupRunsByBranch(runs, 5);

    expect(Object.keys(result).sort()).toEqual(['feature', 'main']);
  });

  it('should sort runs newest first within a branch', () => {
    const runs = [
      run(1, 'main', '2026-08-16T09:00:00Z'),
      run(2, 'main', '2026-08-16T11:00:00Z'),
      run(3, 'main', '2026-08-16T10:00:00Z')
    ];

    const result = groupRunsByBranch(runs, 5);

    expect(result.main.map((item) => item.id)).toEqual([2, 3, 1]);
  });

  it('should slice each branch to countPerBranch independently', () => {
    const runs = [
      run(1, 'main', '2026-08-16T11:00:00Z'),
      run(2, 'main', '2026-08-16T10:00:00Z'),
      run(3, 'main', '2026-08-16T09:00:00Z'),
      run(4, 'feature', '2026-08-16T11:00:00Z'),
      run(5, 'feature', '2026-08-16T10:00:00Z')
    ];

    const result = groupRunsByBranch(runs, 2);

    expect(result.main.map((item) => item.id)).toEqual([1, 2]);
    expect(result.feature.map((item) => item.id)).toEqual([4, 5]);
  });

  it('should skip runs without a head_branch', () => {
    const result = groupRunsByBranch([{ created_at: '2026-08-16T10:00:00Z', head_branch: null, id: 1 } as any], 5);

    expect(result).toEqual({});
  });

  it('should return an empty object for an empty input array', () => {
    expect(groupRunsByBranch([], 5)).toEqual({});
  });

  it('should return no runs per branch when countPerBranch is 0', () => {
    const runs = [run(1, 'main', '2026-08-16T10:00:00Z')];

    const result = groupRunsByBranch(runs, 0);

    expect(result.main).toEqual([]);
  });

  it('should keep both runs when created_at timestamps are identical', () => {
    const runs = [run(1, 'main', '2026-08-16T10:00:00Z'), run(2, 'main', '2026-08-16T10:00:00Z')];

    const result = groupRunsByBranch(runs, 5);

    expect(result.main.map((item) => item.id)).toEqual([1, 2]);
  });

  it('should group a branch named __proto__ without throwing', () => {
    const runs = [run(1, '__proto__', '2026-08-16T10:00:00Z')];

    expect(() => groupRunsByBranch(runs, 5)).not.toThrow();

    const result = groupRunsByBranch(runs, 5);
    expect(result.__proto__).toHaveLength(1);
    expect(result.__proto__[0].id).toBe(1);
  });

  it('should group a branch named constructor without throwing', () => {
    const runs = [run(1, 'constructor', '2026-08-16T10:00:00Z')];

    expect(() => groupRunsByBranch(runs, 5)).not.toThrow();

    const result = groupRunsByBranch(runs, 5);
    // eslint-disable-next-line dot-notation -- dot access resolves to Object.prototype.constructor's type
    expect(result['constructor']).toHaveLength(1);
    // eslint-disable-next-line dot-notation -- as above
    expect(result['constructor'][0].id).toBe(1);
  });
});

describe('orphanPulls', () => {
  it('should return pulls whose branch has no worktree', () => {
    const grouped = groupPullsByBranch(tagPulls([pull(1, 42, 'feature'), pull(2, 43, 'stray')], [], []));

    const result = orphanPulls(grouped, ['main', 'feature']);

    expect(result).toHaveLength(1);
    expect(result[0].pull.number).toBe(43);
  });

  it('should return an empty array when every branch has a worktree', () => {
    const grouped = groupPullsByBranch(tagPulls([pull(1, 42, 'feature')], [], []));

    expect(orphanPulls(grouped, ['feature'])).toEqual([]);
  });

  it('should return an empty array for an empty grouping', () => {
    expect(orphanPulls({}, ['main'])).toEqual([]);
  });
});

describe('sortWorktreesByActivity', () => {
  const wt = (branch: string, isMain = false) => ({ branch, isMain, path: `/p/${branch}` });
  const branches = (result: ReturnType<typeof sortWorktreesByActivity>) => result.map((w) => w.branch);

  it('should keep the main worktree first even with no activity', () => {
    const result = sortWorktreesByActivity(
      [wt('main', true), wt('busy')],
      { busy: [run(1, 'busy', '2026-08-16T10:00:00Z')] },
      { busy: tagPulls([pull(1, 42, 'busy')], [42], []) }
    );

    expect(branches(result)).toEqual(['main', 'busy']);
  });

  it('should move the main worktree to the front from any position', () => {
    const result = sortWorktreesByActivity([wt('a'), wt('main', true), wt('b')], {}, {});

    expect(branches(result)[0]).toBe('main');
  });

  it('should put the most recently active checkout first', () => {
    const result = sortWorktreesByActivity(
      [wt('stale'), wt('fresh'), wt('middle')],
      {
        fresh: [run(1, 'fresh', '2026-08-16T12:00:00Z')],
        middle: [run(2, 'middle', '2026-08-16T10:00:00Z')],
        stale: [run(3, 'stale', '2026-08-14T10:00:00Z')]
      },
      {}
    );

    expect(branches(result)).toEqual(['fresh', 'middle', 'stale']);
  });

  it('should measure activity across pull requests as well as runs', () => {
    const result = sortWorktreesByActivity(
      [wt('old-run'), wt('recent-pull')],
      { 'old-run': [run(1, 'old-run', '2026-08-15T10:00:00Z')] },
      { 'recent-pull': tagPulls([{ ...pull(1, 42, 'recent-pull'), updated_at: '2026-08-16T12:00:00Z' }], [42], []) }
    );

    expect(branches(result)).toEqual(['recent-pull', 'old-run']);
  });

  it('should rank a checkout with no activity last', () => {
    const result = sortWorktreesByActivity(
      [wt('quiet'), wt('busy')],
      { busy: [run(1, 'busy', '2026-08-16T10:00:00Z')] },
      {}
    );

    expect(branches(result)).toEqual(['busy', 'quiet']);
  });

  it('should use a run updated later than it was created', () => {
    const result = sortWorktreesByActivity(
      [wt('created-late'), wt('updated-late')],
      {
        'created-late': [run(1, 'created-late', '2026-08-16T11:00:00Z')],
        'updated-late': [
          { ...run(2, 'updated-late', '2026-08-16T09:00:00Z'), updated_at: '2026-08-16T13:00:00Z' } as any
        ]
      },
      {}
    );

    expect(branches(result)).toEqual(['updated-late', 'created-late']);
  });

  it('should preserve git order between worktrees with no activity', () => {
    const result = sortWorktreesByActivity([wt('a'), wt('b'), wt('c')], {}, {});

    expect(branches(result)).toEqual(['a', 'b', 'c']);
  });

  it('should not mutate the input array', () => {
    const input = [wt('quiet'), wt('busy')];
    sortWorktreesByActivity(input, { busy: [run(1, 'busy', '2026-08-16T10:00:00Z')] }, {});

    expect(input.map((w) => w.branch)).toEqual(['quiet', 'busy']);
  });

  it('should treat empty branch groupings as no activity', () => {
    const result = sortWorktreesByActivity([wt('a'), wt('b')], { a: [] }, { b: [] });

    expect(branches(result)).toEqual(['a', 'b']);
  });
});

describe('orphanRuns', () => {
  it('should return runs whose branch has no worktree', () => {
    const grouped = groupRunsByBranch(
      [run(1, 'feature', '2026-08-16T10:00:00Z'), run(2, 'stray', '2026-08-16T10:00:00Z')],
      5
    );

    const result = orphanRuns(grouped, ['main', 'feature']);

    expect(Object.keys(result)).toEqual(['stray']);
    expect(result.stray.map((item) => item.id)).toEqual([2]);
  });

  it('should return an empty object when every branch has a worktree', () => {
    const grouped = groupRunsByBranch([run(1, 'feature', '2026-08-16T10:00:00Z')], 5);

    expect(orphanRuns(grouped, ['feature'])).toEqual({});
  });

  it('should return an empty object for an empty grouping', () => {
    expect(orphanRuns({}, ['main'])).toEqual({});
  });

  it('should skip branches whose run list is empty', () => {
    expect(orphanRuns({ stray: [] }, ['main'])).toEqual({});
  });
});

describe('buildDetailGroups', () => {
  it('should pair each pull request with the runs on its head branch', () => {
    const pulls = tagPulls([pull(1, 42, 'feature')], [42], []);
    const runsByBranch = groupRunsByBranch([run(1, 'feature', '2026-08-16T10:00:00Z')], 5);

    const result = buildDetailGroups(pulls, runsByBranch, 'feature');

    expect(result).toHaveLength(1);
    expect(result[0].pull?.pull.number).toBe(42);
    expect(result[0].runs.map((item) => item.id)).toEqual([1]);
  });

  it('should append runs that belong to no pull request as a trailing group', () => {
    const runsByBranch = groupRunsByBranch([run(1, 'main', '2026-08-16T10:00:00Z')], 5);

    const result = buildDetailGroups([], runsByBranch, 'main');

    expect(result).toHaveLength(1);
    expect(result[0].pull).toBeUndefined();
    expect(result[0].runs.map((item) => item.id)).toEqual([1]);
  });

  it('should not repeat runs already claimed by a pull request on the same branch', () => {
    const pulls = tagPulls([pull(1, 42, 'feature')], [42], []);
    const runsByBranch = groupRunsByBranch([run(1, 'feature', '2026-08-16T10:00:00Z')], 5);

    const result = buildDetailGroups(pulls, runsByBranch, 'feature');

    expect(result).toHaveLength(1);
  });

  it('should put pull requests before the loose runs', () => {
    const pulls = tagPulls([pull(1, 42, 'stray')], [42], []);
    const runsByBranch = groupRunsByBranch(
      [run(1, 'stray', '2026-08-16T10:00:00Z'), run(2, 'main', '2026-08-16T10:00:00Z')],
      5
    );

    const result = buildDetailGroups(pulls, runsByBranch, 'main');

    expect(result.map((group) => group.pull?.pull.number)).toEqual([42, undefined]);
    expect(result[0].runs.map((item) => item.id)).toEqual([1]);
    expect(result[1].runs.map((item) => item.id)).toEqual([2]);
  });

  it('should return an empty list when there is nothing to show', () => {
    expect(buildDetailGroups([], {}, 'main')).toEqual([]);
  });

  it('should give a pull request with no runs an empty run list', () => {
    const pulls = tagPulls([pull(1, 42, 'feature')], [42], []);

    const result = buildDetailGroups(pulls, {}, 'feature');

    expect(result).toHaveLength(1);
    expect(result[0].runs).toEqual([]);
  });
});

describe('splitDoneRuns', () => {
  const concluded = (id: number, conclusion: null | string, status = 'completed') =>
    ({ conclusion, created_at: '2026-08-16T10:00:00Z', head_branch: 'main', id, status }) as any;

  it('should treat a successful run as done', () => {
    const result = splitDoneRuns([concluded(1, 'success')]);

    expect(result.done.map((item) => item.id)).toEqual([1]);
    expect(result.active).toEqual([]);
  });

  it('should keep a failing run active', () => {
    const result = splitDoneRuns([concluded(1, 'failure')]);

    expect(result.active.map((item) => item.id)).toEqual([1]);
    expect(result.done).toEqual([]);
  });

  it('should keep a run with no conclusion active', () => {
    const result = splitDoneRuns([concluded(1, null, 'in_progress')]);

    expect(result.active.map((item) => item.id)).toEqual([1]);
  });

  it('should keep cancelled and timed-out runs active', () => {
    const result = splitDoneRuns([concluded(1, 'cancelled'), concluded(2, 'timed_out')]);

    expect(result.active.map((item) => item.id)).toEqual([1, 2]);
    expect(result.done).toEqual([]);
  });

  it('should treat neutral and skipped as done', () => {
    const result = splitDoneRuns([concluded(1, 'neutral'), concluded(2, 'skipped')]);

    expect(result.done.map((item) => item.id)).toEqual([1, 2]);
  });

  it('should preserve order within each bucket', () => {
    const result = splitDoneRuns([
      concluded(1, 'success'),
      concluded(2, 'failure'),
      concluded(3, 'success'),
      concluded(4, null, 'queued')
    ]);

    expect(result.done.map((item) => item.id)).toEqual([1, 3]);
    expect(result.active.map((item) => item.id)).toEqual([2, 4]);
  });

  it('should handle an empty list', () => {
    expect(splitDoneRuns([])).toEqual({ active: [], done: [], pinned: [] });
  });
});

describe('isCheckoutDone', () => {
  const merged = (id: number, number: number, ref: string) =>
    ({ head: { ref }, id, merged_at: '2026-08-16T10:00:00Z', number, state: 'closed' }) as any;
  const closed = (id: number, number: number, ref: string) =>
    ({ head: { ref }, id, merged_at: null, number, state: 'closed' }) as any;

  it('should be false when there are no pull requests', () => {
    expect(isCheckoutDone([])).toBe(false);
    expect(isCheckoutDone()).toBe(false);
  });

  it('should be true when every pull request is merged', () => {
    expect(isCheckoutDone(tagPulls([merged(1, 42, 'feature')], [42], []))).toBe(true);
  });

  it('should be true when a pull request is closed without merging', () => {
    expect(isCheckoutDone(tagPulls([closed(1, 42, 'feature')], [42], []))).toBe(true);
  });

  it('should be false while any pull request is still open', () => {
    const pulls = tagPulls([merged(1, 42, 'feature'), pull(2, 43, 'feature')], [42, 43], []);

    expect(isCheckoutDone(pulls)).toBe(false);
  });
});

describe('sortWorktreesByActivity — finished checkouts', () => {
  const wt2 = (branch: string, isMain = false) => ({ branch, isMain, path: `/p/${branch}` });
  const mergedPull = (ref: string) =>
    tagPulls([{ head: { ref }, id: 1, merged_at: '2026-08-16T23:00:00Z', number: 1, state: 'closed' } as any], [1], []);

  it('should sink a checkout whose pull request is merged below active ones', () => {
    const result = sortWorktreesByActivity(
      [wt2('done'), wt2('busy')],
      { busy: [run(1, 'busy', '2026-08-10T10:00:00Z')] },
      { done: mergedPull('done') }
    );

    expect(result.map((item) => item.branch)).toEqual(['busy', 'done']);
  });

  it('should keep main first even when its pull request is merged', () => {
    const result = sortWorktreesByActivity(
      [wt2('busy'), wt2('main', true)],
      { busy: [run(1, 'busy', '2026-08-16T10:00:00Z')] },
      { main: mergedPull('main') }
    );

    expect(result.map((item) => item.branch)).toEqual(['main', 'busy']);
  });
});

describe('splitDoneRuns — pinned workflows', () => {
  const withPath = (id: number, conclusion: null | string, path: string) =>
    ({ conclusion, created_at: '2026-08-16T10:00:00Z', head_branch: 'main', id, path, status: 'completed' }) as any;

  it('should keep a pinned workflow out of the folded bucket even when it succeeded', () => {
    const result = splitDoneRuns(
      [withPath(1, 'success', '.github/workflows/deploy.yml'), withPath(2, 'success', '.github/workflows/ci.yml')],
      ['.github/workflows/deploy.yml']
    );

    expect(result.pinned.map((item) => item.id)).toEqual([1]);
    expect(result.done.map((item) => item.id)).toEqual([2]);
  });

  it('should pin a failing workflow too', () => {
    const result = splitDoneRuns([withPath(1, 'failure', '.github/workflows/deploy.yml')], [
      '.github/workflows/deploy.yml'
    ]);

    expect(result.pinned.map((item) => item.id)).toEqual([1]);
    expect(result.active).toEqual([]);
  });

  it('should leave everything unpinned when no workflow is pinned', () => {
    const result = splitDoneRuns([withPath(1, 'success', '.github/workflows/deploy.yml')]);

    expect(result.pinned).toEqual([]);
    expect(result.done.map((item) => item.id)).toEqual([1]);
  });
});

describe('notifiableBranches', () => {
  it('should include every locally checked out branch', () => {
    const result = notifiableBranches(['main', 'feature'], []);

    expect([...result].sort()).toEqual(['feature', 'main']);
  });

  it('should include branches of pulls the user authored', () => {
    const result = notifiableBranches(['main'], [{ pull: pull(1, 10, 'mine'), tags: ['My'] }]);

    expect(result.has('mine')).toBe(true);
  });

  it('should exclude branches of pulls the user did not author', () => {
    const result = notifiableBranches(['main'], [{ pull: pull(1, 10, 'theirs'), tags: [] }]);

    expect(result.has('theirs')).toBe(false);
  });

  it('should exclude review requested pulls without an authored tag', () => {
    const result = notifiableBranches([], [{ pull: pull(1, 10, 'review'), tags: ['Review requested'] }]);

    expect(result.size).toBe(0);
  });

  it('should skip pulls with no head ref', () => {
    const result = notifiableBranches([], [{ pull: { head: undefined, id: 1, number: 2 } as any, tags: ['My'] }]);

    expect(result.size).toBe(0);
  });
});

describe('mergeRuns', () => {
  const now = new Date('2026-08-16T12:00:00Z').getTime();
  const at = (id: number, createdAt: string) => run(id, 'main', createdAt);

  it('should keep runs that a later fetch no longer returns', () => {
    const result = mergeRuns([at(1, '2026-08-16T11:00:00Z')], [at(2, '2026-08-16T11:59:00Z')], now);

    expect(result.map((item) => item.id).sort()).toEqual([1, 2]);
  });

  it('should let the incoming copy win for the same run', () => {
    const previous = [{ ...at(1, '2026-08-16T11:00:00Z'), conclusion: null }];
    const incoming = [{ ...at(1, '2026-08-16T11:00:00Z'), conclusion: 'success' }];

    const result = mergeRuns(previous, incoming, now);

    expect(result).toHaveLength(1);
    expect(result[0].conclusion).toBe('success');
  });

  it('should drop runs older than 24 hours', () => {
    const result = mergeRuns([at(1, '2026-08-15T11:00:00Z')], [at(2, '2026-08-16T11:00:00Z')], now);

    expect(result.map((item) => item.id)).toEqual([2]);
  });

  it('should return the incoming runs when nothing was held before', () => {
    expect(mergeRuns([], [at(1, '2026-08-16T11:00:00Z')], now).map((item) => item.id)).toEqual([1]);
  });
});

describe('splitOverflow', () => {
  const items = (count: number) => Array.from({ length: count }, (_, index) => index);

  it('should hide nothing when the list is under the limit', () => {
    expect(splitOverflow(items(3), 10)).toEqual({ hidden: [], visible: [0, 1, 2] });
  });

  it('should hide nothing when the list is exactly at the limit', () => {
    const result = splitOverflow(items(10), 10);

    expect(result.hidden).toEqual([]);
    expect(result.visible).toHaveLength(10);
  });

  it('should hide the tail past the limit', () => {
    const result = splitOverflow(items(13), 10);

    expect(result.visible).toHaveLength(10);
    expect(result.hidden).toEqual([10, 11, 12]);
  });

  it('should default to a limit of 10', () => {
    expect(splitOverflow(items(12)).hidden).toEqual([10, 11]);
  });

  it('should handle an empty list', () => {
    expect(splitOverflow([], 10)).toEqual({ hidden: [], visible: [] });
  });
});

describe('splitDoneRuns — only the latest pinned run', () => {
  const pinnedRun = (id: number, createdAt: string, conclusion: null | string = 'success') =>
    ({ conclusion, created_at: createdAt, head_branch: 'main', id, path: '.github/deploy.yml' }) as any;

  it('should pin only the newest run of a pinned workflow', () => {
    const result = splitDoneRuns(
      [pinnedRun(1, '2026-08-16T10:00:00Z'), pinnedRun(2, '2026-08-16T12:00:00Z'), pinnedRun(3, '2026-08-16T11:00:00Z')],
      ['.github/deploy.yml']
    );

    expect(result.pinned.map((run) => run.id)).toEqual([2]);
  });

  it('should fold the older pinned runs in with the rest', () => {
    const result = splitDoneRuns(
      [pinnedRun(1, '2026-08-16T10:00:00Z'), pinnedRun(2, '2026-08-16T12:00:00Z')],
      ['.github/deploy.yml']
    );

    expect(result.done.map((run) => run.id)).toEqual([1]);
  });

  it('should keep an older pinned run that is still running out of the done pile', () => {
    const result = splitDoneRuns(
      [pinnedRun(1, '2026-08-16T10:00:00Z', null), pinnedRun(2, '2026-08-16T12:00:00Z')],
      ['.github/deploy.yml']
    );

    expect(result.pinned.map((run) => run.id)).toEqual([2]);
    expect(result.active.map((run) => run.id)).toEqual([1]);
  });

  it('should pin the newest run of each pinned workflow separately', () => {
    const other = { ...pinnedRun(9, '2026-08-16T09:00:00Z'), path: '.github/release.yml' } as any;
    const result = splitDoneRuns(
      [pinnedRun(1, '2026-08-16T10:00:00Z'), pinnedRun(2, '2026-08-16T12:00:00Z'), other],
      ['.github/deploy.yml', '.github/release.yml']
    );

    expect(result.pinned.map((run) => run.id).sort()).toEqual([2, 9]);
  });
});
