import { create } from 'zustand';

import { Group, Groups } from 'types/Group';

type State = {
  groups: Groups;
};

type Actions = {
  addGroup: (group: Group) => void;
};

export const useNewGroups = create<State & Actions>((set, get) => ({
  addGroup: (group: Group) => {
    set((state) => ({ groups: [...state.groups, group] }));
    window.bridge.settings.set('newGroups', get().groups);
  },
  groups: [],
  updateGroup: (group: Group) => set((state) => ({ groups: state.groups.map((g) => (g.id === group.id ? group : g)) }))
}));

(async () => {
  const groups = await window.bridge.settings.get('newGroups');
  useNewGroups.setState({ groups });
})();
