import { ipcMain, safeStorage } from 'electron';

import { settings } from '../settings';

ipcMain.handle('settings:get', (_, key) => settings.get(key));

ipcMain.handle('settings:set', (_, key, value, safe?: boolean) => {
  const state = settings.get(key);

  const newValue = value;

  if (safe) {
    Object.keys(newValue).forEach((key) => {
      if (newValue[key]) {
        newValue[key] = safeStorage.encryptString(String(newValue[key]));
      }
    });
  }

  if (!Array.isArray(state)) {
    return settings.set(key, { ...state, ...value });
  }

  return settings.set(key, value);
});
