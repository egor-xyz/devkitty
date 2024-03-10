import { create } from 'zustand';

import { Group, Groups } from 'types';

type State = {
  groups: Groups;
};

export const useNewGroups = create<State>((set) => ({
  addGroup: (group: Group) => set((state) => ({ groups: [...state.groups, group] })),
  groups: []
}));
