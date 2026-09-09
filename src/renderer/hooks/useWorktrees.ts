import { create } from 'zustand';

export type WorktreeEntry = {
  branch: string;
  isMain: boolean;
  path: string;
  // Everything the command palette should be able to find this worktree by:
  // its branch, its runs' names, and its pull requests' titles, pre-joined so
  // the palette never has to know about runs/pulls itself.
  searchText: string;
};

type WorktreesStore = {
  byProject: Record<string, WorktreeEntry[]>;
  setWorktrees: (projectId: string, worktrees: WorktreeEntry[]) => void;
};

// Shared, app-wide view of each project's worktrees. Each Project card owns
// its own git polling and pushes its results in here so the command palette
// (which never fetches git status itself) can list every worktree.
export const useWorktrees = create<WorktreesStore>((set) => ({
  byProject: {},
  setWorktrees: (projectId, worktrees) =>
    set((state) => ({ byProject: { ...state.byProject, [projectId]: worktrees } }))
}));
