import { create } from 'zustand';

import { Group } from 'types/Group';

type State = {
  collapsedGroups: Group['id'][];
};

type Actions = {
  toggleCollapsed: (id: string) => void;
  unselectCollapsed: () => void;
};

export const useGroups = create<State & Actions>((set, get) => ({
  collapsedGroups: [],
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
  const collapsedGroups = await window.bridge.settings.get('collapsedGroups');
  useGroups.setState({ collapsedGroups });
})();
