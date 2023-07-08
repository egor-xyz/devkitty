import { create } from 'zustand';

import { ThemeSource } from 'types';

type Store = {
  darkMode: boolean;
  setDarkMode: (darkMode: Store['darkMode']) => void;
  setThemeSource: (themeSource: Store['themeSource']) => void;
  themeSource: ThemeSource;
};

export const useDarkModeStore = create<Store>()((set) => ({
  darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
  setDarkMode: (darkMode) => set({ darkMode }),
  setThemeSource: (themeSource: ThemeSource) => set({ themeSource }),
  themeSource: 'system'
}));

(async () => {
  const themeSource = await window.bridge.settings.get('themeSource');
  useDarkModeStore.setState({ themeSource });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    useDarkModeStore.setState({ darkMode: event.matches });
  });
})();

export const useDarkMode = () => {
  const { themeSource, setThemeSource, darkMode } = useDarkModeStore();

  const setTheme = async (theme: Store['themeSource']) => {
    if (theme === themeSource) return;
    window.bridge.darkMode.set(theme);
    setThemeSource(theme);
  };

  const toggleDarkMode = async () => {
    if (themeSource === 'system') return;
    window.bridge.darkMode.toggle();
    setThemeSource(themeSource === 'dark' ? 'light' : 'dark');
  };

  return { darkMode, setTheme, themeSource, toggleDarkMode };
};
