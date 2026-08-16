import { describe, expect, it } from 'vitest';

import { groupPullsByBranch, groupRunsByBranch, orphanPulls, tagPulls } from './groupByBranch';

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
});
