import { create } from 'zustand';

import { Group, Groups } from 'types/Group';

type State = {
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
  groups: []
}));

(async () => {
  const groups = await window.bridge.settings.get('newGroups');
  useNewGroups.setState({ groups });
})();
