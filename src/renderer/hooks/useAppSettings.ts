import { type AppSettings } from 'types/appSettings';
import { create } from 'zustand';

type Actions = {
  set: (settings: Partial<AppSettings>, safe?: boolean) => void;
};

export const useAppSettings = create<Actions & AppSettings>((set) => ({
  editors: [],
  fetchInterval: 10000,
  gitHubActions: {
    all: true,
    count: 3,
    ignoreDependabot: false,
    inProgress: false
  },
  gitHubPulls: {
    pollInterval: 300000
  },
  set: (newState, safe) => {
    set(() => {
      window.bridge.settings.set('appSettings', newState, safe);
      return newState;
    });
  },
  shells: [],
  showLogo: true,
  showWorktrees: true
}));

(async () => {
  const state = await window.bridge.settings.get('appSettings');
  useAppSettings.setState(state);
})();

(async () => {
  window.bridge.settings.onAppSettings((_, value) => {
    useAppSettings.setState(value);
  });
})();
