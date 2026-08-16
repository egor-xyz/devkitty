import { describe, expect, it } from 'vitest';

import {
  groupPullsByBranch,
  groupRunsByBranch,
  orphanPulls,
  orphanRuns,
  sortWorktreesByActivity,
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

  it('should rank pull request above runs, and runs above nothing', () => {
    const result = sortWorktreesByActivity(
      [wt('quiet'), wt('runs-only'), wt('pull-only'), wt('both')],
      { both: [run(1, 'both', '2026-08-16T10:00:00Z')], 'runs-only': [run(2, 'runs-only', '2026-08-16T10:00:00Z')] },
      { both: tagPulls([pull(1, 1, 'both')], [1], []), 'pull-only': tagPulls([pull(2, 2, 'pull-only')], [2], []) }
    );

    expect(branches(result)).toEqual(['both', 'pull-only', 'runs-only', 'quiet']);
  });

  it('should preserve git order between worktrees of equal activity', () => {
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
