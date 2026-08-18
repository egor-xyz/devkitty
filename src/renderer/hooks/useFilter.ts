import { create } from 'zustand';

type FilterStore = {
  clear: () => void;
  query: string;
  setQuery: (query: string) => void;
};

// One filter for the whole window: the navbar writes it, every repo reads it.
export const useFilter = create<FilterStore>((set) => ({
  clear: () => set({ query: '' }),
  query: '',
  setQuery: (query) => set({ query })
}));
