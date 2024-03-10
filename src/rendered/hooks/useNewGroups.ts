import { create } from 'zustand';

import { Group, Groups } from 'types/Group';

type State = {
  groupIds: string[];
  groups: Groups;
};

type Actions = {
  addGroup: (group: Group) => void;
  deleteGroup: (id: string) => void;
};

export const useNewGroups = create<State & Actions>((set, get) => ({
  addGroup: (group: Group) => {
    set((state) => ({ groups: [...state.groups, group] }));
    window.bridge.settings.set('newGroups', get().groups);
  },
  deleteGroup: (id: string) => {
    set((state) => ({ groups: state.groups.filter((group) => group.id !== id) }));
    window.bridge.settings.set('newGroups', get().groups);
  },
  groupIds: [],
  groups: []
}));

(async () => {
  const groups: Groups = await window.bridge.settings.get('newGroups');
  const groupIds = groups.map(({ id }) => id);
  useNewGroups.setState({ groupIds, groups });
})();
