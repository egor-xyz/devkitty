import { create } from 'zustand';

import { Group, Groups } from 'types/Group';

type State = {
  collapsedGroups: Group['id'][];
  groupIds: string[];
  groups: Groups;
};

type Actions = {
  addGroup: (group: Group) => void;
  changeOrder: (dragIndex: number, hoverIndex: number) => void;
  deleteGroup: (id: string) => void;
  toggleCollapsed: (id: string) => void;
  unselectCollapsed: () => void;
};

export const useGroups = create<State & Actions>((set, get) => ({
  addGroup: (group: Group) => {
    set((state) => ({
      groups: [...state.groups, group]
    }));
    window.bridge.settings.set('newGroups', get().groups);
  },
  changeOrder: (dragIndex, hoverIndex) => {
    const newGroups = [...get().groups];
    const [removed] = newGroups.splice(dragIndex, 1);
    newGroups.splice(hoverIndex, 0, removed);

    set({ groups: newGroups });
    window.bridge.settings.set('newGroups', get().groups);
  },
  collapsedGroups: [],
  deleteGroup: (id: string) => {
    set((state) => ({
      groups: state.groups.filter((group) => group.id !== id)
    }));
    window.bridge.settings.set('newGroups', get().groups);
  },
  groupIds: [],
  groups: [],
  toggleCollapsed: (id) => {
    const { collapsedGroups } = get();
    const index = collapsedGroups.indexOf(id);

    const newCollapsedGroups = index === -1 ? [...collapsedGroups, id] : collapsedGroups.filter((_, i) => i !== index);

    set({ collapsedGroups: newCollapsedGroups });
    window.bridge.settings.set('collapsedGroups', newCollapsedGroups);
  },
  unselectCollapsed: () => {
    set({ collapsedGroups: [] });
    window.bridge.settings.set('collapsedGroups', []);
  }
}));

(async () => {
  let groups: Groups = await window.bridge.settings.get('newGroups');

  // tmp fix related to ungrouped bug 19.06.2024
  if (groups.includes(null)) {
    groups = groups.filter((group) => group !== null);
    window.bridge.settings.set('newGroups', groups);
  }

  const groupIds = groups.map(({ id }) => id);

  console.log(groups, groupIds);

  useGroups.setState({ groupIds, groups });
})();

(async () => {
  const collapsedGroups = await window.bridge.settings.get('collapsedGroups');
  useGroups.setState({ collapsedGroups });
})();
