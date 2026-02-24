import { beforeEach, describe, expect, it, vi } from 'vitest';

const handlers: Record<string, (...args: any[]) => any> = {};

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: any) => {
      handlers[channel] = handler;
    })
  },
  nativeTheme: {
    shouldUseDarkColors: false,
    themeSource: 'system'
  }
}));

vi.mock('../settings', () => ({
  settings: {
    get: vi.fn(),
    set: vi.fn()
  }
}));

// Import after mocks are set up to capture handlers
import { nativeTheme } from 'electron';

import { settings } from '../settings';

// Trigger the side effects that register IPC handlers
await import('./ipcDarkMode');

const mockSettings = vi.mocked(settings);
const mockNativeTheme = vi.mocked(nativeTheme);

describe('ipcDarkMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNativeTheme.themeSource = 'system';
    (mockNativeTheme as any).shouldUseDarkColors = false;
  });

  describe('dark-mode:set', () => {
    it('should set nativeTheme.themeSource to the provided theme', () => {
      handlers['dark-mode:set']({}, 'dark');

      expect(mockNativeTheme.themeSource).toBe('dark');
    });

    it('should persist the theme to settings', () => {
      handlers['dark-mode:set']({}, 'light');

      expect(mockSettings.set).toHaveBeenCalledWith('themeSource', 'light');
    });

    it('should handle system theme', () => {
      handlers['dark-mode:set']({}, 'system');

      expect(mockNativeTheme.themeSource).toBe('system');
      expect(mockSettings.set).toHaveBeenCalledWith('themeSource', 'system');
    });
  });

  describe('dark-mode:toggle', () => {
    it('should set theme to light when currently dark', () => {
      (mockNativeTheme as any).shouldUseDarkColors = true;

      handlers['dark-mode:toggle']();

      expect(mockNativeTheme.themeSource).toBe('light');
      expect(mockSettings.set).toHaveBeenCalledWith('themeSource', 'light');
    });

    it('should set theme to dark when currently light', () => {
      (mockNativeTheme as any).shouldUseDarkColors = false;

      handlers['dark-mode:toggle']();

      expect(mockNativeTheme.themeSource).toBe('dark');
      expect(mockSettings.set).toHaveBeenCalledWith('themeSource', 'dark');
    });

    it('should return the new shouldUseDarkColors value', () => {
      (mockNativeTheme as any).shouldUseDarkColors = false;

      const result = handlers['dark-mode:toggle']();

      expect(result).toBe(false);
    });
  });
});
