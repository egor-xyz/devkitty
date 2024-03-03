import { ipcMain, safeStorage } from 'electron';

import log from 'electron-log';

import { settings } from '../settings';

ipcMain.handle('settings:get', (_, key) => settings.get(key));

ipcMain.handle('settings:set', (_, key, value, safe?: boolean) => {
  const state = settings.get(key);

  const newValue = { ...value };

  log.info('settings:set', key, newValue);

  if (safe) {
    Object.keys(newValue).forEach((key) => {
      if (newValue[key]) {
        newValue[key] = safeStorage.encryptString(String(newValue[key]));
      }
    });
  }

  log.info('settings:set2', key, newValue);

  if (!Array.isArray(state)) {
    return settings.set(key, { ...state, ...newValue });
  }

  return settings.set(key, newValue);
});
