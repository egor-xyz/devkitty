import { type Group, type Groups } from 'types/Group';
import { create } from 'zustand';

type Actions = {
  addGroup: (group: Group) => void;
  changeOrder: (dragIndex: number, hoverIndex: number) => void;
  deleteGroup: (id: string) => void;
  renameGroup: (id: string, name: string) => void;
  toggleCollapsed: (id: string) => void;
  unselectCollapsed: () => void;
};

type State = {
  collapsedGroups: Group['id'][];
  groupIds: string[];
  groups: Groups;
};

const updateGroupIds = (groups: Groups) => groups.map(({ id }) => id);

export const useGroups = create<Actions & State>((set, get) => ({
  addGroup: (group: Group) => {
    const newGroups = [...get().groups, group];
    set({
      groupIds: updateGroupIds(newGroups),
      groups: newGroups
    });
    window.bridge.settings.set('newGroups', newGroups);
  },
  changeOrder: (dragIndex, hoverIndex) => {
    const newGroups = [...get().groups];
    const [removed] = newGroups.splice(dragIndex, 1);
    newGroups.splice(hoverIndex, 0, removed);

    set({
      groupIds: updateGroupIds(newGroups),
      groups: newGroups
    });
    window.bridge.settings.set('newGroups', newGroups);
  },
  collapsedGroups: [],
  deleteGroup: (id: string) => {
    const newGroups = get().groups.filter((group) => group.id !== id);
    set({
      groupIds: updateGroupIds(newGroups),
      groups: newGroups
    });
    window.bridge.settings.set('newGroups', newGroups);
  },
  groupIds: [],
  groups: [],
  renameGroup: (id: string, name: string) => {
    const newGroups = get().groups.map((group) =>
      group.id === id ? { ...group, fullName: name, name } : group
    );
    set({ groups: newGroups });
    window.bridge.settings.set('newGroups', newGroups);
  },
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

  useGroups.setState({
    groupIds: updateGroupIds(groups),
    groups
  });
})();

(async () => {
  const collapsedGroups = await window.bridge.settings.get('collapsedGroups');
  useGroups.setState({ collapsedGroups });
})();
