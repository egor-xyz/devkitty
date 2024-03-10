import { create } from 'zustand';

import { Group, Groups } from 'types/Group';

type State = {
  groupIds: string[];
  groups: Groups;
  order: Group['id'][];
};

type Actions = {
  addGroup: (group: Group) => void;
  changeOrder: (dragIndex: number, hoverIndex: number) => void;
  deleteGroup: (id: string) => void;
};

export const useNewGroups = create<State & Actions>((set, get) => ({
  addGroup: (group: Group) => {
    set((state) => ({ groups: [...state.groups, group], order: [...state.order, group.id] }));
    window.bridge.settings.set('newGroups', get().groups);
    window.bridge.settings.set('newGroupsOrder', get().order);
  },
  changeOrder: (dragIndex, hoverIndex) => {
    const newOrder = [...get().order];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(hoverIndex, 0, removed);

    const newGroups = newOrder.map((id) => get().groups.find((group) => group.id === id)).filter(Boolean);

    set({ groups: newGroups, order: newOrder });
    window.bridge.settings.set('newGroupsOrder', newOrder);
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
  const groups: Groups = await window.bridge.settings.get('newGroups');
  const order: Group['id'][] = await window.bridge.settings.get('newGroupsOrder');

  const groupIds = groups.map(({ id }) => id);
  const orderedGroups = order.map((id) => groups.find((group) => group.id === id));
  const others = groups.filter((group) => !order.includes(group.id));
  const ordered = [...orderedGroups, ...others].filter(Boolean);
  const newOrderIds = ordered.map(({ id }) => id);

  if (newOrderIds.join('') !== order.join('')) {
    window.bridge.settings.set('newGroupsOrder', newOrderIds);
  }

  useNewGroups.setState({ groupIds, groups: ordered, order });
})();
