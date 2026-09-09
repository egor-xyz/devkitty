import { beforeEach, describe, expect, it } from 'vitest';

import { useFocus } from './useFocus';

describe('useFocus', () => {
  beforeEach(() => {
    useFocus.setState({ focusedProjectId: null, focusedWorktreePath: null });
  });

  it('should start with no focused project or worktree', () => {
    expect(useFocus.getState().focusedProjectId).toBe(null);
    expect(useFocus.getState().focusedWorktreePath).toBe(null);
  });

  it('should set the focused project when setFocus is called', () => {
    useFocus.getState().setFocus('foo');

    expect(useFocus.getState().focusedProjectId).toBe('foo');
  });

  it('should clear the focused worktree when setFocus is called', () => {
    useFocus.getState().setWorktreeFocus('foo', '/path/a');

    useFocus.getState().setFocus('foo');

    expect(useFocus.getState().focusedProjectId).toBe('foo');
    expect(useFocus.getState().focusedWorktreePath).toBe(null);
  });

  it('should set both the focused project and worktree when setWorktreeFocus is called', () => {
    useFocus.getState().setWorktreeFocus('foo', '/path/a');

    expect(useFocus.getState().focusedProjectId).toBe('foo');
    expect(useFocus.getState().focusedWorktreePath).toBe('/path/a');
  });

  it('should reset the focused project and worktree to null when clearFocus is called', () => {
    useFocus.getState().setWorktreeFocus('foo', '/path/a');

    useFocus.getState().clearFocus();

    expect(useFocus.getState().focusedProjectId).toBe(null);
    expect(useFocus.getState().focusedWorktreePath).toBe(null);
  });
});
