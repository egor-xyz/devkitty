import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  screen: {
    getDisplayMatching: vi.fn()
  }
}));

vi.mock('../../main/settings', () => ({
  settings: {
    get: vi.fn(),
    set: vi.fn()
  }
}));

import { screen } from 'electron';

import { settings } from '../../main/settings';
import { loadWindowState, saveBounds } from './window';

const mockScreen = vi.mocked(screen);
const mockSettings = vi.mocked(settings);

describe('window', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadWindowState', () => {
    it('should return the stored bounds unchanged when position and size are valid', () => {
      const bounds = { height: 600, width: 800, x: 100, y: 100 };
      mockSettings.get.mockReturnValue(bounds as any);
      mockScreen.getDisplayMatching.mockReturnValue({
        workArea: { height: 1080, width: 1920, x: 0, y: 0 }
      } as any);

      const result = loadWindowState();

      expect(result).toEqual({ height: 600, width: 800, x: 100, y: 100 });
    });

    it('should recenter the window when the stored position is off-screen', () => {
      const bounds = { height: 600, width: 800, x: -5000, y: -5000 };
      mockSettings.get.mockReturnValue(bounds as any);
      mockScreen.getDisplayMatching.mockReturnValue({
        workArea: { height: 1080, width: 1920, x: 0, y: 0 }
      } as any);

      const result = loadWindowState();

      expect(result.x).toBe(0 + (1920 - 800) / 2);
      expect(result.y).toBe(0 + (1080 - 600) / 2);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    it('should recenter the window when the stored size exceeds the work area', () => {
      const bounds = { height: 2000, width: 3000, x: 100, y: 100 };
      mockSettings.get.mockReturnValue(bounds as any);
      mockScreen.getDisplayMatching.mockReturnValue({
        workArea: { height: 1080, width: 1920, x: 0, y: 0 }
      } as any);

      const result = loadWindowState();

      expect(result.x).toBe(0 + (1920 - 3000) / 2);
      expect(result.y).toBe(0 + (1080 - 2000) / 2);
    });

    it('should account for a non-zero work area origin when recentering', () => {
      const bounds = { height: 600, width: 800, x: -100, y: -100 };
      mockSettings.get.mockReturnValue(bounds as any);
      mockScreen.getDisplayMatching.mockReturnValue({
        workArea: { height: 1080, width: 1920, x: 50, y: 50 }
      } as any);

      const result = loadWindowState();

      expect(result.x).toBe(50 + (1920 - 800) / 2);
      expect(result.y).toBe(50 + (1080 - 600) / 2);
    });
  });

  describe('saveBounds', () => {
    it('should persist the main window bounds to settings', () => {
      const bounds = { height: 600, width: 800, x: 10, y: 20 };
      const mainWindow = { getBounds: () => bounds } as any;

      saveBounds(mainWindow);

      expect(mockSettings.set).toHaveBeenCalledWith('windowBounds', bounds);
    });
  });
});
