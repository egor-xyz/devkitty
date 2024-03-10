import { create } from 'zustand';

import { AppSettings } from 'types/appSettings';

type Actions = {
  set: (settings: Partial<AppSettings>, safe?: boolean) => void;
};

export const useAppSettings = create<AppSettings & Actions>((set) => ({
  editors: [],
  fetchInterval: 10000,
  oldFashionGroups: false,
  projectActionCollapsed: true,
  set: (newState, safe) => {
    set(() => {
      window.bridge.settings.set('appSettings', newState, safe);
      return newState;
    });
  },
  shells: [],
  showLogo: true,
  soundEffects: true
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
