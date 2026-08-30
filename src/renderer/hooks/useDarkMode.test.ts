// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDarkMode, useDarkModeStore } from './useDarkMode';

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

  describe('useDarkMode hook', () => {
    it('should expose the current darkMode value from the store', () => {
      useDarkModeStore.setState({ darkMode: true });

      const { result } = renderHook(() => useDarkMode());

      expect(result.current.darkMode).toBe(true);
    });

    it('should call bridge.darkMode.set and update themeSource when setTheme is given a different theme', () => {
      useDarkModeStore.setState({ themeSource: 'system' });

      const { result } = renderHook(() => useDarkMode());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(window.bridge.darkMode.set).toHaveBeenCalledWith('dark');
      expect(result.current.themeSource).toBe('dark');
    });

    it('should not call bridge.darkMode.set when setTheme is given the current theme', () => {
      useDarkModeStore.setState({ themeSource: 'dark' });

      const { result } = renderHook(() => useDarkMode());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(window.bridge.darkMode.set).not.toHaveBeenCalled();
    });

    it('should call bridge.darkMode.toggle and flip themeSource from dark to light', () => {
      useDarkModeStore.setState({ themeSource: 'dark' });

      const { result } = renderHook(() => useDarkMode());

      act(() => {
        result.current.toggleDarkMode();
      });

      expect(window.bridge.darkMode.toggle).toHaveBeenCalled();
      expect(result.current.themeSource).toBe('light');
    });

    it('should call bridge.darkMode.toggle and flip themeSource from light to dark', () => {
      useDarkModeStore.setState({ themeSource: 'light' });

      const { result } = renderHook(() => useDarkMode());

      act(() => {
        result.current.toggleDarkMode();
      });

      expect(window.bridge.darkMode.toggle).toHaveBeenCalled();
      expect(result.current.themeSource).toBe('dark');
    });

    it('should not call bridge.darkMode.toggle when themeSource is system', () => {
      useDarkModeStore.setState({ themeSource: 'system' });

      const { result } = renderHook(() => useDarkMode());

      act(() => {
        result.current.toggleDarkMode();
      });

      expect(window.bridge.darkMode.toggle).not.toHaveBeenCalled();
    });
  });

  describe('OS color scheme change listener registered at module load', () => {
    const originalMatchMedia = window.matchMedia;

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
    });

    it('should update darkMode in the store when the OS color scheme preference changes', async () => {
      vi.resetModules();

      let changeHandler: ((event: { matches: boolean }) => void) | undefined;
      window.matchMedia = vi.fn(() => ({
        addEventListener: vi.fn((eventName: string, handler: (event: { matches: boolean }) => void) => {
          if (eventName === 'change') changeHandler = handler;
        }),
        matches: false,
        removeEventListener: vi.fn()
      })) as unknown as typeof window.matchMedia;

      const freshModule = await import('./useDarkMode');

      // Let the module's top-level IIFE resolve its awaited bridge.settings.get call
      // and reach the matchMedia().addEventListener('change', ...) registration.
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

      expect(changeHandler).toBeDefined();

      act(() => {
        changeHandler?.({ matches: true });
      });

      expect(freshModule.useDarkModeStore.getState().darkMode).toBe(true);
    });
  });
});
