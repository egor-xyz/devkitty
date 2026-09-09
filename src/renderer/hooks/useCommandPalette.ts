import { create } from 'zustand';

type CommandPaletteStore = {
  close: () => void;
  isOpen: boolean;
  open: () => void;
  toggle: () => void;
};

// Global ⌘K command palette visibility. Ephemeral, not persisted.
export const useCommandPalette = create<CommandPaletteStore>((set) => ({
  close: () => set({ isOpen: false }),
  isOpen: false,
  open: () => set({ isOpen: true }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen }))
}));
