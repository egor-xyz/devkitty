import { beforeEach, describe, expect, it } from 'vitest';

import { useWorktrees } from './useWorktrees';

describe('useWorktrees', () => {
  beforeEach(() => {
    useWorktrees.setState({ byProject: {} });
  });

  it('should start with no worktrees', () => {
    expect(useWorktrees.getState().byProject).toEqual({});
  });

  it('should set the worktrees for a project', () => {
    const worktrees = [{ branch: 'main', isMain: true, path: '/path/a', searchText: 'main' }];

    useWorktrees.getState().setWorktrees('1', worktrees);

    expect(useWorktrees.getState().byProject).toEqual({ '1': worktrees });
  });

  it('should not clobber other projects when setting one project', () => {
    useWorktrees
      .getState()
      .setWorktrees('1', [{ branch: 'main', isMain: true, path: '/path/a', searchText: 'main' }]);
    useWorktrees
      .getState()
      .setWorktrees('2', [{ branch: 'main', isMain: true, path: '/path/b', searchText: 'main' }]);

    expect(Object.keys(useWorktrees.getState().byProject)).toEqual(['1', '2']);
  });

  it('should overwrite a project`s previous worktrees', () => {
    useWorktrees
      .getState()
      .setWorktrees('1', [{ branch: 'main', isMain: true, path: '/path/a', searchText: 'main' }]);
    useWorktrees
      .getState()
      .setWorktrees('1', [{ branch: 'feature', isMain: false, path: '/path/b', searchText: 'feature' }]);

    expect(useWorktrees.getState().byProject['1']).toEqual([
      { branch: 'feature', isMain: false, path: '/path/b', searchText: 'feature' }
    ]);
  });
});
