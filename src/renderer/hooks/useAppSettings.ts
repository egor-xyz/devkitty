import { type AppSettings } from 'types/appSettings';
import { create } from 'zustand';

type Actions = {
  set: (settings: Partial<AppSettings>, safe?: boolean) => void;
};

export const useAppSettings = create<Actions & AppSettings>((set) => ({
  claudeEnabled: true,
  editors: [],
  fetchInterval: 10000,
  gitHubActions: {
    all: true,
    count: 5,
    ignoreDependabot: false,
    ignoredWorkflows: [],
    notifications: true,
    pinnedWorkflows: []
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
  showClaudeUsage: false,
  showLogo: true,
  showWorktrees: true,
  theme: 'sunset'
}));

export const useIsSunset = () => useAppSettings((s) => (s.theme ?? 'sunset') === 'sunset');

(async () => {
  const state = await window.bridge.settings.get('appSettings');
  useAppSettings.setState(state);
})();

(async () => {
  window.bridge.settings.onAppSettings((_, value) => {
    useAppSettings.setState(value);
  });
})();
