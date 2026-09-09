import { create } from 'zustand';

type FocusStore = {
  clearFocus: () => void;
  focusedProjectId: null | string;
  focusedWorktreePath: null | string;
  setFocus: (id: string) => void;
  setWorktreeFocus: (projectId: string, worktreePath: string) => void;
};

// Focus mode: narrows the main list to a single project, and optionally to a
// single worktree within it. Ephemeral, not persisted.
export const useFocus = create<FocusStore>((set) => ({
  clearFocus: () => set({ focusedProjectId: null, focusedWorktreePath: null }),
  focusedProjectId: null,
  focusedWorktreePath: null,
  setFocus: (id) => set({ focusedProjectId: id, focusedWorktreePath: null }),
  setWorktreeFocus: (projectId, worktreePath) =>
    set({ focusedProjectId: projectId, focusedWorktreePath: worktreePath })
}));
