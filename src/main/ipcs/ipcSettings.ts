import { ipcMain } from 'electron';

import { settings } from '../settings';

ipcMain.handle('settings:get', (_, key) => {
  return settings.get(key);
});

ipcMain.handle('settings:set', (_, key, value) => {
  const state = settings.get(key);

  if (!Array.isArray(state)) {
    return settings.set(key, { ...state, ...value });
  }

  return settings.set(key, value);
});
