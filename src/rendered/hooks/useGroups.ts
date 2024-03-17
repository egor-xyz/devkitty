import { create } from 'zustand';

import { Group, Groups } from 'types/Group';

import { groups } from './utils/groups';

type State = {
  collapsedGroups: Group['id'][];
  groups: Groups;
  selectedGroups: Group['id'][];
};

type Actions = {
  selectAll: () => void;
  toggleCollapsed: (id: string) => void;
  toggleSelected: (id: string) => void;
  unselectAll: () => void;
  unselectCollapsed: () => void;
};

export const useGroups = create<State & Actions>((set, get) => ({
  collapsedGroups: [],
  groups,
  selectAll: () => {
    const { groups } = get();

    const selectedGroups = groups.map((group) => group.id);

    set({ selectedGroups });
    window.bridge.settings.set('selectedGroups', selectedGroups);
  },
  selectedGroups: [],
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
  const selectedGroups = await window.bridge.settings.get('selectedGroups');
  useGroups.setState({ selectedGroups });
})();
