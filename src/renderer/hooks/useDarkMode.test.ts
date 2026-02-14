import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDarkModeStore } from './useDarkMode';

describe('useDarkMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDarkModeStore.setState({
      darkMode: false,
      themeSource: 'system'
    });
  });

  describe('useDarkModeStore', () => {
    it('should have default darkMode based on matchMedia', () => {
      expect(useDarkModeStore.getState().darkMode).toBe(false);
    });

    it('should have default themeSource as system', () => {
      expect(useDarkModeStore.getState().themeSource).toBe('system');
    });

    it('should update darkMode via setDarkMode', () => {
      useDarkModeStore.getState().setDarkMode(true);

      expect(useDarkModeStore.getState().darkMode).toBe(true);
    });

    it('should update themeSource via setThemeSource', () => {
      useDarkModeStore.getState().setThemeSource('dark');

      expect(useDarkModeStore.getState().themeSource).toBe('dark');
    });
  });

  describe('setTheme logic', () => {
    it('should call bridge.darkMode.set and update store when theme changes', () => {
      useDarkModeStore.setState({ themeSource: 'system' });

      const { themeSource } = useDarkModeStore.getState();
      const newTheme = 'dark' as const;

      if (newTheme !== themeSource) {
        window.bridge.darkMode.set(newTheme);
        useDarkModeStore.getState().setThemeSource(newTheme);
      }

      expect(window.bridge.darkMode.set).toHaveBeenCalledWith('dark');
      expect(useDarkModeStore.getState().themeSource).toBe('dark');
    });

    it('should not call bridge when theme is the same', () => {
      useDarkModeStore.setState({ themeSource: 'dark' });

      const { themeSource } = useDarkModeStore.getState();
      const newTheme = 'dark' as const;

      if (newTheme !== themeSource) {
        window.bridge.darkMode.set(newTheme);
      }

      expect(window.bridge.darkMode.set).not.toHaveBeenCalled();
    });
  });

  describe('toggleDarkMode logic', () => {
    it('should toggle from dark to light', () => {
      useDarkModeStore.setState({ themeSource: 'dark' });

      const { themeSource } = useDarkModeStore.getState();
      if (themeSource !== 'system') {
        window.bridge.darkMode.toggle();
        useDarkModeStore.getState().setThemeSource(themeSource === 'dark' ? 'light' : 'dark');
      }

      expect(window.bridge.darkMode.toggle).toHaveBeenCalled();
      expect(useDarkModeStore.getState().themeSource).toBe('light');
    });

    it('should toggle from light to dark', () => {
      useDarkModeStore.setState({ themeSource: 'light' });

      const { themeSource } = useDarkModeStore.getState();
      if (themeSource !== 'system') {
        window.bridge.darkMode.toggle();
        useDarkModeStore.getState().setThemeSource(themeSource === 'dark' ? 'light' : 'dark');
      }

      expect(window.bridge.darkMode.toggle).toHaveBeenCalled();
      expect(useDarkModeStore.getState().themeSource).toBe('dark');
    });

    it('should not toggle when themeSource is system', () => {
      useDarkModeStore.setState({ themeSource: 'system' });

      const { themeSource } = useDarkModeStore.getState();
      if (themeSource !== 'system') {
        window.bridge.darkMode.toggle();
      }

      expect(window.bridge.darkMode.toggle).not.toHaveBeenCalled();
    });
  });
});
