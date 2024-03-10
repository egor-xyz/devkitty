import { create } from 'zustand';

import { Group, Groups } from 'types/Group';

type State = {
  groupIds: string[];
  groups: Groups;
  order: Group['id'][];
};

type Actions = {
  addGroup: (group: Group) => void;
  deleteGroup: (id: string) => void;
};

export const useNewGroups = create<State & Actions>((set, get) => ({
  addGroup: (group: Group) => {
    set((state) => ({ groups: [...state.groups, group], order: [...state.order, group.id] }));
    window.bridge.settings.set('newGroups', get().groups);
    window.bridge.settings.set('newGroupsOrder', get().order);
  },
  deleteGroup: (id: string) => {
    set((state) => ({
      groups: state.groups.filter((group) => group.id !== id),
      order: state.order.filter((groupId) => groupId !== id)
    }));
    window.bridge.settings.set('newGroups', get().groups);
    window.bridge.settings.set('newGroupsOrder', get().order);
  },
  groupIds: [],
  groups: [],
  order: []
}));

(async () => {
  let groups: Groups = await window.bridge.settings.get('newGroups');
  const order: Group['id'][] = await window.bridge.settings.get('newGroupsOrder');
  const groupIds = groups.map(({ id }) => id);
  groups = order.map((id) => groups.find((group) => group.id === id)!);
  useNewGroups.setState({ groupIds, groups });
})();
