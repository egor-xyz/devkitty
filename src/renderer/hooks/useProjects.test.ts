import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the toaster to avoid DOM dependency
vi.mock('renderer/utils/appToaster', () => ({
  appToaster: Promise.resolve({
    show: vi.fn()
  })
}));

import { useProjects } from './useProjects';

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProjects.setState({ projects: [] });
  });

  describe('initial state', () => {
    it('should start with empty projects array', () => {
      expect(useProjects.getState().projects).toEqual([]);
    });
  });

  describe('addProject', () => {
    it('should add projects and refresh from settings', async () => {
      const newProjects = [{ filePath: '/path/a', id: '1', name: 'project-a' }];
      (window.bridge.projects.add as any).mockResolvedValue({ success: true });
      (window.bridge.settings.get as any).mockResolvedValue(newProjects);

      await useProjects.getState().addProject();

      expect(window.bridge.projects.add).toHaveBeenCalled();
      expect(useProjects.getState().projects).toEqual(newProjects);
    });

    it('should show error toast when add fails and not refresh projects', async () => {
      (window.bridge.projects.add as any).mockResolvedValue({
        canceled: false,
        message: 'Something went wrong',
        success: false
      });

      await useProjects.getState().addProject();

      expect(window.bridge.projects.add).toHaveBeenCalled();
    });

    it('should not show error toast when user cancels dialog', async () => {
      (window.bridge.projects.add as any).mockResolvedValue({ canceled: true, success: false });

      await useProjects.getState().addProject();

      expect(window.bridge.projects.add).toHaveBeenCalled();
    });
  });

  describe('removeProject', () => {
    it('should remove project and refresh from settings', async () => {
      useProjects.setState({
        projects: [
          { filePath: '/path/a', id: '1', name: 'a' },
          { filePath: '/path/b', id: '2', name: 'b' }
        ]
      });
      (window.bridge.projects.remove as any).mockResolvedValue(undefined);
      (window.bridge.settings.get as any).mockResolvedValue([{ filePath: '/path/b', id: '2', name: 'b' }]);

      await useProjects.getState().removeProject('1');

      expect(window.bridge.projects.remove).toHaveBeenCalledWith('1');
      expect(useProjects.getState().projects).toEqual([{ filePath: '/path/b', id: '2', name: 'b' }]);
    });
  });

  describe('addGroupId', () => {
    it('should update project with a group id and refresh', async () => {
      const project = { filePath: '/path/a', id: 'proj-1', name: 'project-a' };
      useProjects.setState({ projects: [project] });

      const updatedProjects = [{ ...project, groupId: 'group-1' }];
      (window.bridge.projects.update as any).mockResolvedValue(undefined);
      (window.bridge.settings.get as any).mockResolvedValue(updatedProjects);

      await useProjects.getState().addGroupId('proj-1', 'group-1');

      expect(window.bridge.projects.update).toHaveBeenCalledWith(
        expect.objectContaining({ groupId: 'group-1', id: 'proj-1' })
      );
      expect(useProjects.getState().projects).toEqual(updatedProjects);
    });

    it('should do nothing when project is not found', async () => {
      useProjects.setState({ projects: [] });

      await useProjects.getState().addGroupId('nonexistent', 'group-1');

      expect(window.bridge.projects.update).not.toHaveBeenCalled();
    });

    it('should allow clearing group id by passing undefined', async () => {
      const project = { filePath: '/path/a', groupId: 'group-1', id: 'proj-1', name: 'project-a' };
      useProjects.setState({ projects: [project] });

      const updatedProjects = [{ ...project, groupId: undefined }];
      (window.bridge.projects.update as any).mockResolvedValue(undefined);
      (window.bridge.settings.get as any).mockResolvedValue(updatedProjects);

      await useProjects.getState().addGroupId('proj-1', undefined);

      expect(window.bridge.projects.update).toHaveBeenCalledWith(
        expect.objectContaining({ groupId: undefined, id: 'proj-1' })
      );
    });
  });
});
