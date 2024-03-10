import { create } from 'zustand';

import { Group, Groups } from 'types';

type State = {
  groups: Groups;
};

type Actions = {
  addGroup: (group: Group) => void;
};

export const useNewGroups = create<State & Actions>((set) => ({
  addGroup: (group: Group) => set((state) => ({ groups: [...state.groups, group] })),
  groups: []
}));
