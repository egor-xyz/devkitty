import { ipcMain, safeStorage } from 'electron';

import { settings } from '../settings';

ipcMain.handle('settings:get', (_, key) => settings.get(key));

ipcMain.handle('settings:set', (_, key, value, safe?: boolean) => {
  const state = settings.get(key);

  if (safe) {
    Object.keys(value).forEach((key) => {
      if (value[key]) {
        value[key] = safeStorage.encryptString(String(value[key]));
      }
    });
  }

  //TODO: tmp fix for groups if they not array
  if (!Array.isArray(state) && (key === 'selectedGroups' || key === 'collapsedGroups')) {
    return settings.set(key, value);
  }

  if (!Array.isArray(state)) {
    return settings.set(key, { ...state, ...value });
  }

  return settings.set(key, value);
});
