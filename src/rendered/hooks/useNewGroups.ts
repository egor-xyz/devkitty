import { create } from 'zustand';

import { Group, Groups } from 'types/Group';

type State = {
  groupIds: string[];
  groups: Groups;
};

type Actions = {
  addGroup: (group: Group) => void;
  changeOrder: (dragIndex: number, hoverIndex: number) => void;
  deleteGroup: (id: string) => void;
};

export const useNewGroups = create<State & Actions>((set, get) => ({
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
  deleteGroup: (id: string) => {
    set((state) => ({
      groups: state.groups.filter((group) => group.id !== id)
    }));
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
