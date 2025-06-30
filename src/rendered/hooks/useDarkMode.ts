import { type ThemeSource } from 'types/Modal';
import { create } from 'zustand';

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

// Apply dark mode class to document root for Tailwind
const applyDarkModeClass = (darkMode: boolean) => {
  if (darkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

(async () => {
  const themeSource = await window.bridge.settings.get('themeSource');
  useDarkModeStore.setState({ themeSource });

  // Apply initial dark mode class
  const initialDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyDarkModeClass(initialDarkMode);

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    useDarkModeStore.setState({ darkMode: event.matches });
    applyDarkModeClass(event.matches);
  });
})();

export const useDarkMode = () => {
  const { darkMode, setThemeSource, themeSource } = useDarkModeStore();

  const setTheme = async (theme: Store['themeSource']) => {
    if (theme === themeSource) return;
    window.bridge.darkMode.set(theme);
    setThemeSource(theme);
    
    // Update dark mode class based on theme
    if (theme === 'dark') {
      applyDarkModeClass(true);
    } else if (theme === 'light') {
      applyDarkModeClass(false);
    } else { // system
      applyDarkModeClass(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  };

  const toggleDarkMode = async () => {
    if (themeSource === 'system') return;
    window.bridge.darkMode.toggle();
    const newTheme = themeSource === 'dark' ? 'light' : 'dark';
    setThemeSource(newTheme);
    applyDarkModeClass(newTheme === 'dark');
  };

  return { darkMode, setTheme, themeSource, toggleDarkMode };
};
