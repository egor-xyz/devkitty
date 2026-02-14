import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGroups } from './useGroups';

describe('useGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useGroups.setState({
      collapsedGroups: [],
      groupIds: [],
      groups: []
    });
  });

  describe('addGroup', () => {
    it('should add a group to the store', () => {
      const group = { id: 'group-1', name: 'Frontend' };

      useGroups.getState().addGroup(group);

      const state = useGroups.getState();
      expect(state.groups).toHaveLength(1);
      expect(state.groups[0]).toEqual(group);
      expect(state.groupIds).toEqual(['group-1']);
    });

    it('should persist new groups to settings', () => {
      const group = { id: 'group-1', name: 'Frontend' };

      useGroups.getState().addGroup(group);

      expect(window.bridge.settings.set).toHaveBeenCalledWith('newGroups', [group]);
    });

    it('should append to existing groups', () => {
      useGroups.setState({
        groupIds: ['group-1'],
        groups: [{ id: 'group-1', name: 'Frontend' }]
      });

      useGroups.getState().addGroup({ id: 'group-2', name: 'Backend' });

      const state = useGroups.getState();
      expect(state.groups).toHaveLength(2);
      expect(state.groupIds).toEqual(['group-1', 'group-2']);
    });
  });

  describe('deleteGroup', () => {
    it('should remove the group with the given id', () => {
      useGroups.setState({
        groupIds: ['group-1', 'group-2'],
        groups: [
          { id: 'group-1', name: 'Frontend' },
          { id: 'group-2', name: 'Backend' }
        ]
      });

      useGroups.getState().deleteGroup('group-1');

      const state = useGroups.getState();
      expect(state.groups).toHaveLength(1);
      expect(state.groups[0].id).toBe('group-2');
      expect(state.groupIds).toEqual(['group-2']);
    });

    it('should persist the updated groups to settings', () => {
      useGroups.setState({
        groupIds: ['group-1'],
        groups: [{ id: 'group-1', name: 'Frontend' }]
      });

      useGroups.getState().deleteGroup('group-1');

      expect(window.bridge.settings.set).toHaveBeenCalledWith('newGroups', []);
    });

    it('should handle deleting a non-existent group gracefully', () => {
      useGroups.setState({
        groupIds: ['group-1'],
        groups: [{ id: 'group-1', name: 'Frontend' }]
      });

      useGroups.getState().deleteGroup('nonexistent');

      expect(useGroups.getState().groups).toHaveLength(1);
    });
  });

  describe('renameGroup', () => {
    it('should rename the group with the given id', () => {
      useGroups.setState({
        groupIds: ['group-1'],
        groups: [{ id: 'group-1', name: 'Old Name' }]
      });

      useGroups.getState().renameGroup('group-1', 'New Name');

      const state = useGroups.getState();
      expect(state.groups[0].name).toBe('New Name');
      expect(state.groups[0].fullName).toBe('New Name');
    });

    it('should not modify other groups', () => {
      useGroups.setState({
        groupIds: ['group-1', 'group-2'],
        groups: [
          { id: 'group-1', name: 'Frontend' },
          { id: 'group-2', name: 'Backend' }
        ]
      });

      useGroups.getState().renameGroup('group-1', 'UI');

      expect(useGroups.getState().groups[1].name).toBe('Backend');
    });

    it('should persist the updated groups to settings', () => {
      useGroups.setState({
        groupIds: ['group-1'],
        groups: [{ id: 'group-1', name: 'Old Name' }]
      });

      useGroups.getState().renameGroup('group-1', 'New Name');

      expect(window.bridge.settings.set).toHaveBeenCalledWith('newGroups', expect.any(Array));
    });
  });

  describe('changeOrder', () => {
    it('should move a group from one position to another', () => {
      useGroups.setState({
        groupIds: ['a', 'b', 'c'],
        groups: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
          { id: 'c', name: 'C' }
        ]
      });

      useGroups.getState().changeOrder(0, 2);

      const state = useGroups.getState();
      expect(state.groups.map((g) => g.id)).toEqual(['b', 'c', 'a']);
      expect(state.groupIds).toEqual(['b', 'c', 'a']);
    });

    it('should persist the new order to settings', () => {
      useGroups.setState({
        groupIds: ['a', 'b'],
        groups: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' }
        ]
      });

      useGroups.getState().changeOrder(1, 0);

      expect(window.bridge.settings.set).toHaveBeenCalledWith('newGroups', expect.any(Array));
    });
  });

  describe('toggleCollapsed', () => {
    it('should add group id to collapsedGroups when not collapsed', () => {
      useGroups.setState({ collapsedGroups: [] });

      useGroups.getState().toggleCollapsed('group-1');

      expect(useGroups.getState().collapsedGroups).toEqual(['group-1']);
    });

    it('should remove group id from collapsedGroups when already collapsed', () => {
      useGroups.setState({ collapsedGroups: ['group-1'] });

      useGroups.getState().toggleCollapsed('group-1');

      expect(useGroups.getState().collapsedGroups).toEqual([]);
    });

    it('should persist collapsed state to settings', () => {
      useGroups.setState({ collapsedGroups: [] });

      useGroups.getState().toggleCollapsed('group-1');

      expect(window.bridge.settings.set).toHaveBeenCalledWith('collapsedGroups', ['group-1']);
    });
  });

  describe('unselectCollapsed', () => {
    it('should clear all collapsed groups', () => {
      useGroups.setState({ collapsedGroups: ['group-1', 'group-2'] });

      useGroups.getState().unselectCollapsed();

      expect(useGroups.getState().collapsedGroups).toEqual([]);
    });

    it('should persist empty collapsed state', () => {
      useGroups.setState({ collapsedGroups: ['group-1'] });

      useGroups.getState().unselectCollapsed();

      expect(window.bridge.settings.set).toHaveBeenCalledWith('collapsedGroups', []);
    });
  });
});
