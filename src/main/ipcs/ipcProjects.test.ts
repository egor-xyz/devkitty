import { describe, it, expect, vi, beforeEach } from 'vitest';

const handlers: Record<string, (...args: any[]) => any> = {};

vi.mock('electron', () => ({
  dialog: {
    showOpenDialog: vi.fn()
  },
  ipcMain: {
    handle: vi.fn((channel: string, handler: any) => {
      handlers[channel] = handler;
    })
  }
}));

vi.mock('../settings', () => ({
  settings: {
    get: vi.fn(),
    set: vi.fn()
  }
}));

vi.mock('uuid', () => ({
  v5: Object.assign(vi.fn((...args: any[]) => `uuid-${args[0]}`), {
    URL: '6ba7b811-9dad-11d1-80b4-00c04fd430c8'
  })
}));

import { dialog } from 'electron';
import { settings } from '../settings';

await import('./ipcProjects');

const mockSettings = vi.mocked(settings);
const mockDialog = vi.mocked(dialog);

describe('ipcProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('projects:get', () => {
    it('should return projects from settings', () => {
      const projects = [{ filePath: '/path/to/project', id: '1', name: 'project' }];
      mockSettings.get.mockReturnValueOnce(projects as any);

      const result = handlers['projects:get']();

      expect(result).toEqual(projects);
      expect(mockSettings.get).toHaveBeenCalledWith('projects');
    });
  });

  describe('projects:add', () => {
    it('should return canceled when dialog is canceled', async () => {
      mockDialog.showOpenDialog.mockResolvedValueOnce({ canceled: true, filePaths: [] });

      const result = await handlers['projects:add']();

      expect(result).toEqual({ canceled: true, success: false });
    });

    it('should add new projects from selected directories', async () => {
      mockDialog.showOpenDialog.mockResolvedValueOnce({
        canceled: false,
        filePaths: ['/Users/test/repos/my-app']
      });
      mockSettings.get.mockResolvedValueOnce([] as any);

      const result = await handlers['projects:add']();

      expect(result).toEqual({ success: true });
      expect(mockSettings.set).toHaveBeenCalledWith(
        'projects',
        expect.arrayContaining([
          expect.objectContaining({
            filePath: '/Users/test/repos/my-app',
            name: 'my-app'
          })
        ])
      );
    });

    it('should not add duplicate projects with same filePath', async () => {
      mockDialog.showOpenDialog.mockResolvedValueOnce({
        canceled: false,
        filePaths: ['/Users/test/repos/existing']
      });
      mockSettings.get.mockResolvedValueOnce([
        { filePath: '/Users/test/repos/existing', id: 'existing-id', name: 'existing' }
      ] as any);

      await handlers['projects:add']();

      expect(mockSettings.set).toHaveBeenCalledWith(
        'projects',
        [{ filePath: '/Users/test/repos/existing', id: 'existing-id', name: 'existing' }]
      );
    });

    it('should sort projects alphabetically by name', async () => {
      mockDialog.showOpenDialog.mockResolvedValueOnce({
        canceled: false,
        filePaths: ['/Users/test/repos/zebra', '/Users/test/repos/alpha']
      });
      mockSettings.get.mockResolvedValueOnce([] as any);

      await handlers['projects:add']();

      const savedProjects = (mockSettings.set as any).mock.calls[0][1];
      expect(savedProjects[0].name).toBe('alpha');
      expect(savedProjects[1].name).toBe('zebra');
    });

    it('should add multiple directories at once', async () => {
      mockDialog.showOpenDialog.mockResolvedValueOnce({
        canceled: false,
        filePaths: ['/Users/test/repos/app1', '/Users/test/repos/app2']
      });
      mockSettings.get.mockResolvedValueOnce([] as any);

      await handlers['projects:add']();

      const savedProjects = (mockSettings.set as any).mock.calls[0][1];
      expect(savedProjects).toHaveLength(2);
    });

    it('should open dialog with correct properties', async () => {
      mockDialog.showOpenDialog.mockResolvedValueOnce({ canceled: true, filePaths: [] });

      await handlers['projects:add']();

      expect(mockDialog.showOpenDialog).toHaveBeenCalledWith({
        properties: ['openDirectory', 'multiSelections']
      });
    });
  });

  describe('projects:update', () => {
    it('should update the matching project', async () => {
      mockSettings.get.mockResolvedValueOnce([
        { filePath: '/path/a', id: '1', name: 'project-a' },
        { filePath: '/path/b', id: '2', name: 'project-b' }
      ] as any);

      const updatedProject = { filePath: '/path/a', groupId: 'group-1', id: '1', name: 'project-a-renamed' };

      const result = await handlers['projects:update']({}, updatedProject);

      expect(result).toEqual({ success: true });
      expect(mockSettings.set).toHaveBeenCalledWith('projects', [
        updatedProject,
        { filePath: '/path/b', id: '2', name: 'project-b' }
      ]);
    });

    it('should not modify other projects', async () => {
      const projects = [
        { filePath: '/path/a', id: '1', name: 'a' },
        { filePath: '/path/b', id: '2', name: 'b' }
      ];
      mockSettings.get.mockResolvedValueOnce(projects as any);

      await handlers['projects:update']({}, { filePath: '/path/a', id: '1', name: 'updated' });

      const saved = (mockSettings.set as any).mock.calls[0][1];
      expect(saved[1]).toEqual({ filePath: '/path/b', id: '2', name: 'b' });
    });
  });

  describe('projects:remove', () => {
    it('should remove the project with the given id', async () => {
      mockSettings.get.mockResolvedValueOnce([
        { filePath: '/path/a', id: '1', name: 'a' },
        { filePath: '/path/b', id: '2', name: 'b' }
      ] as any);

      const result = await handlers['projects:remove']({}, '1');

      expect(result).toEqual({ success: true });
      expect(mockSettings.set).toHaveBeenCalledWith('projects', [{ filePath: '/path/b', id: '2', name: 'b' }]);
    });

    it('should handle removing a non-existent project gracefully', async () => {
      mockSettings.get.mockResolvedValueOnce([{ filePath: '/path/a', id: '1', name: 'a' }] as any);

      const result = await handlers['projects:remove']({}, 'nonexistent');

      expect(result).toEqual({ success: true });
      expect(mockSettings.set).toHaveBeenCalledWith('projects', [{ filePath: '/path/a', id: '1', name: 'a' }]);
    });
  });
});
