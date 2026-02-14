import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppSettings } from './useAppSettings';

describe('useAppSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAppSettings.setState({
      editors: [],
      fetchInterval: 10000,
      gitHubActions: {
        all: true,
        count: 3,
        ignoreDependabot: false,
        inProgress: false
      },
      shells: [],
      showLogo: true,
      showWorktrees: true
    });
  });

  describe('initial state', () => {
    it('should have default fetchInterval of 10000', () => {
      expect(useAppSettings.getState().fetchInterval).toBe(10000);
    });

    it('should have empty editors array', () => {
      expect(useAppSettings.getState().editors).toEqual([]);
    });

    it('should have empty shells array', () => {
      expect(useAppSettings.getState().shells).toEqual([]);
    });

    it('should have showLogo enabled by default', () => {
      expect(useAppSettings.getState().showLogo).toBe(true);
    });

    it('should have showWorktrees enabled by default', () => {
      expect(useAppSettings.getState().showWorktrees).toBe(true);
    });

    it('should have default gitHubActions settings', () => {
      const { gitHubActions } = useAppSettings.getState();
      expect(gitHubActions.all).toBe(true);
      expect(gitHubActions.count).toBe(3);
      expect(gitHubActions.inProgress).toBe(false);
    });
  });

  describe('set', () => {
    it('should update state with new settings', () => {
      useAppSettings.getState().set({ fetchInterval: 5000 });

      expect(useAppSettings.getState().fetchInterval).toBe(5000);
    });

    it('should persist settings via bridge', () => {
      useAppSettings.getState().set({ fetchInterval: 5000 });

      expect(window.bridge.settings.set).toHaveBeenCalledWith('appSettings', { fetchInterval: 5000 }, undefined);
    });

    it('should pass safe flag when encrypting', () => {
      useAppSettings.getState().set({ gitHubToken: 'my-token' } as any, true);

      expect(window.bridge.settings.set).toHaveBeenCalledWith('appSettings', { gitHubToken: 'my-token' }, true);
    });

    it('should allow partial updates', () => {
      useAppSettings.getState().set({ showLogo: false });

      const state = useAppSettings.getState();
      expect(state.showLogo).toBe(false);
      expect(state.fetchInterval).toBe(10000);
    });
  });
});
