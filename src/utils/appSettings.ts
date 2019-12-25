import { copyFile, readFileSync } from 'fs-extra';
import electron from 'electron';
import { file, getSync, setSync, unsetSync } from 'electron-settings';
import { api } from 'electron-util';

import { AppStoreState } from 'context/types';
import { defGroups, defGroupsIds, Group } from 'models';
import { clearCredentials } from 'utils/secretsService';
import { msg } from 'utils/Msg';

const APP_STORE_KEY = 'appStore';

export const getSavedState = (): Partial<AppStoreState> => {
  try {
    const state: any = getSync(APP_STORE_KEY) ?? {};
    return {
      ...state,
      collapsedGroups: new Set<string>(state.collapsedGroups),
      groups: [...defGroups, ...((state.groups ?? []).filter((g: Group) => !defGroupsIds.includes(g.id)))]
    };
  } catch {
    return {};
  }
};

export const setAppStoreSettings = (value: Partial<AppStoreState>): void => {
  Object.keys(value).forEach(key => {
    setSync(`${APP_STORE_KEY}.${key}`, (value as any)[key]);
  });
};

export const exportAllSettings = async (): Promise<void> => {
  const { filePath } = await electron.remote.dialog.showSaveDialog(
    electron.remote.getCurrentWindow(),
    {
      defaultPath: `devkitty.settings.${api.remote.app.getVersion()}.json`,
      properties: ['showOverwriteConfirmation']
    }
  );
  if (!filePath) return;

  copyFile(file(), filePath);
};

export const importAllSettings = async (): Promise<void> => {
  const { filePaths } = await electron.remote.dialog.showOpenDialog(
    electron.remote.getCurrentWindow(),
    {
      filters: [{ extensions: ['json'], name: '*' }],
      properties: ['openFile']
    }
  );
  if (!filePaths.length || !filePaths[0]) return;

  let settings;
  try {
    settings = JSON.parse(readFileSync(filePaths[0], 'utf-8'));
  } catch {
    return;
  }
  if (!settings) return;

  // tmp fix for versions before 1.1.0
  if (settings.appStore) {
    copyFile(filePaths[0], file());
  } else {
    setSync(APP_STORE_KEY, settings);
  }

  window.location.reload();
};

export const resetAllSettings = (): void => {
  clearCredentials();
  unsetSync();
  msg.show({
    icon: 'tick',
    intent: 'success',
    message: 'All settings deleted'
  });
  window.location.href = window.location.pathname;
};