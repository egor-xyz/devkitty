import { create } from 'zustand';

import { Group, Groups } from 'types';
import { appToaster } from 'rendered/utils/appToaster';

import { groups } from './utils/groups';

type State = {
  collapsedGroups: Group['id'][];
  groupAliases: Groups;
  groups: Groups;
  groupsWithAliases: Groups;
  selectedGroups: Group['id'][];
};

type Actions = {
  removeGroupAlias: (id: string) => void;
  selectAll: () => void;
  setGroupAlias: (group: Group) => void;
  toggleCollapsed: (id: string) => void;
  toggleSelected: (id: string) => void;
  unselectAll: () => void;
  unselectCollapsed: () => void;
};

export const useGroups = create<State & Actions>((set, get) => ({
  collapsedGroups: [],
  groupAliases: [],
  groups,
  groupsWithAliases: [],
  removeGroupAlias: async (id) => {
    const { groupAliases } = get();

    const newGroupAliases = groupAliases.filter((groupAlias) => groupAlias.id !== id);

    set({ groupAliases: newGroupAliases });

    window.bridge.settings.set('groupAliases', newGroupAliases);

    const newGroupsWithAliases = groups.map((group) => {
      const groupAlias = newGroupAliases.find((groupAlias) => groupAlias.id === group.id);
      return groupAlias ? { ...group, ...groupAlias } : group;
    });
    set({ groupsWithAliases: newGroupsWithAliases });

    (await appToaster).show({
      icon: 'tick-circle',
      intent: 'success',
      message: `Group alias for group "${id}" removed`
    });
  },
  selectAll: () => {
    const { groups } = get();

    const selectedGroups = groups.map((group) => group.id);

    set({ selectedGroups });
    window.bridge.settings.set('selectedGroups', selectedGroups);
  },
  selectedGroups: [],
  setGroupAlias: async (group) => {
    const { groupAliases } = get();

    const index = groupAliases.findIndex((groupAlias) => groupAlias.id === group.id);

    // if exist replace or add

    const newGroupAliases =
      index === -1 ? [...groupAliases, group] : groupAliases.map((groupAlias, i) => (i === index ? group : groupAlias));

    set({ groupAliases: newGroupAliases });

    window.bridge.settings.set('groupAliases', newGroupAliases);

    const newGroupsWithAliases = groups.map((group) => {
      const groupAlias = newGroupAliases.find((groupAlias) => groupAlias.id === group.id);
      return groupAlias ? { ...group, ...groupAlias } : group;
    });
    set({ groupsWithAliases: newGroupsWithAliases });

    (await appToaster).show({
      icon: 'tick-circle',
      intent: 'success',
      message: `Group alias for "${group.id}" set to "${group.fullName}"`
    });
  },
  toggleCollapsed: (id) => {
    const { collapsedGroups } = get();
    const index = collapsedGroups.indexOf(id);

    const newCollapsedGroups = index === -1 ? [...collapsedGroups, id] : collapsedGroups.filter((_, i) => i !== index);

    set({ collapsedGroups: newCollapsedGroups });
    window.bridge.settings.set('collapsedGroups', newCollapsedGroups);
  },
  toggleSelected: (id) => {
    const { selectedGroups } = get();
    const index = selectedGroups.indexOf(id);

    const newSelectedGroups = index === -1 ? [...selectedGroups, id] : selectedGroups.filter((_, i) => i !== index);

    set({ selectedGroups: newSelectedGroups });
    window.bridge.settings.set('selectedGroups', newSelectedGroups);
  },
  unselectAll: () => {
    set({ selectedGroups: [] });
    window.bridge.settings.set('selectedGroups', []);
  },
  unselectCollapsed: () => {
    set({ collapsedGroups: [] });
    window.bridge.settings.set('collapsedGroups', []);
  }
}));

(async () => {
  const collapsedGroups = await window.bridge.settings.get('collapsedGroups');
  useGroups.setState({ collapsedGroups });
})();

(async () => {
  const groupAliases: Groups = await window.bridge.settings.get('groupAliases');
  useGroups.setState({ groupAliases });

  const groupsWithAliases = groups.map((group) => {
    const groupAlias = groupAliases.find((groupAlias) => groupAlias.id === group.id);
    return groupAlias ? { ...group, ...groupAlias } : group;
  });
  useGroups.setState({ groupsWithAliases });
})();

(async () => {
  const selectedGroups = await window.bridge.settings.get('selectedGroups');
  useGroups.setState({ selectedGroups });
})();
