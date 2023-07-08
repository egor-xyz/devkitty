import { ipcMain, nativeTheme } from 'electron';

import { ThemeSource } from 'types';

import { settings } from '../settings';

ipcMain.handle('dark-mode:set', (_event, theme: ThemeSource) => {
  nativeTheme.themeSource = theme;
  settings.set('themeSource', theme);
});

ipcMain.handle('dark-mode:toggle', () => {
  if (nativeTheme.shouldUseDarkColors) {
    nativeTheme.themeSource = 'light';
    settings.set('themeSource', 'light');
  } else {
    nativeTheme.themeSource = 'dark';
    settings.set('themeSource', 'dark');
  }

  return nativeTheme.shouldUseDarkColors;
});
