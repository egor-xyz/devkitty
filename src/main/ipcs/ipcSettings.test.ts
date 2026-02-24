import { beforeEach, describe, expect, it, vi } from 'vitest';

const handlers: Record<string, (...args: any[]) => any> = {};

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: any) => {
      handlers[channel] = handler;
    })
  },
  safeStorage: {
    encryptString: vi.fn((str: string) => Buffer.from(`encrypted:${str}`))
  }
}));

vi.mock('../settings', () => ({
  settings: {
    get: vi.fn(),
    set: vi.fn()
  }
}));

import { settings } from '../settings';

await import('./ipcSettings');

const mockSettings = vi.mocked(settings);

describe('ipcSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('settings:get', () => {
    it('should return the value from settings for the given key', () => {
      mockSettings.get.mockReturnValueOnce('some-value' as any);

      const result = handlers['settings:get']({}, 'themeSource');

      expect(result).toBe('some-value');
      expect(mockSettings.get).toHaveBeenCalledWith('themeSource');
    });

    it('should return projects array', () => {
      const projects = [{ filePath: '/path', id: '1', name: 'test' }];
      mockSettings.get.mockReturnValueOnce(projects as any);

      const result = handlers['settings:get']({}, 'projects');

      expect(result).toEqual(projects);
    });
  });

  describe('settings:set', () => {
    it('should merge object values with existing state when state is not an array', () => {
      mockSettings.get.mockReturnValueOnce({ existing: 'value', fetchInterval: 10000 } as any);

      handlers['settings:set']({}, 'appSettings', { fetchInterval: 5000 });

      expect(mockSettings.set).toHaveBeenCalledWith('appSettings', {
        existing: 'value',
        fetchInterval: 5000
      });
    });

    it('should replace the value entirely when state is an array', () => {
      mockSettings.get.mockReturnValueOnce([{ id: '1' }] as any);
      const newProjects = [{ id: '2' }];

      handlers['settings:set']({}, 'projects', newProjects);

      expect(mockSettings.set).toHaveBeenCalledWith('projects', newProjects);
    });

    it('should encrypt values when safe flag is true', () => {
      mockSettings.get.mockReturnValueOnce({} as any);

      handlers['settings:set']({}, 'appSettings', { gitHubToken: 'my-secret-token' }, true);

      expect(mockSettings.set).toHaveBeenCalledWith('appSettings', {
        gitHubToken: Buffer.from('encrypted:my-secret-token')
      });
    });

    it('should not encrypt falsy values when safe flag is true', () => {
      mockSettings.get.mockReturnValueOnce({} as any);

      handlers['settings:set']({}, 'appSettings', { gitHubToken: '' }, true);

      // Falsy values are not encrypted
      expect(mockSettings.set).toHaveBeenCalledWith('appSettings', { gitHubToken: '' });
    });

    it('should encrypt all truthy keys when safe flag is true', () => {
      mockSettings.get.mockReturnValueOnce({} as any);

      handlers['settings:set']({}, 'appSettings', { key1: 'val1', key2: 'val2' }, true);

      expect(mockSettings.set).toHaveBeenCalledWith('appSettings', {
        key1: Buffer.from('encrypted:val1'),
        key2: Buffer.from('encrypted:val2')
      });
    });
  });
});
