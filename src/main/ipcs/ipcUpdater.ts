import { app, BrowserWindow, ipcMain } from 'electron';
import log from 'electron-log';
import electronUpdater from 'electron-updater';
import { type UpdateState } from 'types/update';

import { settings } from '../settings';

const { autoUpdater } = electronUpdater;
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const UPDATE_ERROR_MESSAGE = 'The update failed. Try again later.';
const canUpdate = (): boolean => app.isPackaged && process.platform === 'darwin';
let state: UpdateState = { status: 'idle' };
let checkPromise: Promise<void> | undefined;
let downloading = false;
let hasAvailableUpdate = false;
let installing = false;
let started = false;

const publishState = (next: UpdateState): void => {
  state = next;
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send('updater:state', state);
  }
};

const autoDownloadEnabled = (): boolean => settings.get('appSettings')?.autoUpdate !== false;
const isReady = (): boolean => state.status === 'ready';

const reportError = (error: unknown): void => {
  downloading = false;
  installing = false;
  log.error('Update failed', error);
  if (state.status === 'error' && state.error === UPDATE_ERROR_MESSAGE) return;
  publishState({ error: UPDATE_ERROR_MESSAGE, status: 'error', version: state.version });
};

const download = async (): Promise<void> => {
  if (!canUpdate()) return;
  if (downloading || isReady()) return;
  if (!hasAvailableUpdate) {
    await check();
    if (!hasAvailableUpdate || downloading || isReady()) return;
  }

  downloading = true;
  publishState({ status: 'downloading', version: state.version });
  try {
    await autoUpdater.downloadUpdate();
  } catch (error) {
    reportError(error);
  } finally {
    downloading = false;
  }
};

const check = (): Promise<void> => {
  if (checkPromise) return checkPromise;
  if (downloading || state.status === 'ready') return Promise.resolve();
  checkPromise = Promise.resolve().then(async () => {
    try {
      autoUpdater.autoDownload = autoDownloadEnabled();
      await autoUpdater.checkForUpdates();
      // The setting can change while the check is in flight.
      if (hasAvailableUpdate && autoDownloadEnabled() && !autoUpdater.autoDownload) {
        await download();
      }
    } catch (error) {
      reportError(error);
    }
  }).finally(() => {
    checkPromise = undefined;
  });
  return checkPromise;
};

export const checkForUpdatesManually = async (): Promise<'unsupported' | UpdateState> => {
  if (!canUpdate()) return 'unsupported';
  await check();
  return state;
};

autoUpdater.logger = log;
autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.on('update-available', (info) => {
  hasAvailableUpdate = true;
  if (downloading) return;
  downloading = autoUpdater.autoDownload;
  publishState({ status: autoUpdater.autoDownload ? 'downloading' : 'available', version: info.version });
});
autoUpdater.on('update-not-available', () => {
  if (downloading) return;
  hasAvailableUpdate = false;
  downloading = false;
  publishState({ status: 'idle' });
});
autoUpdater.on('update-downloaded', (info) => {
  downloading = false;
  publishState({ status: 'ready', version: info.version });
});
autoUpdater.on('error', reportError);

ipcMain.handle('updater:getState', (): UpdateState => state);
ipcMain.handle('updater:download', download);
ipcMain.handle('updater:install', (): void => {
  if (!canUpdate() || state.status !== 'ready' || installing) return;
  installing = true;
  try {
    autoUpdater.quitAndInstall();
  } catch (error) {
    installing = false;
    reportError(error);
  }
});

export const startUpdater = (): void => {
  if (started || !canUpdate()) return;
  started = true;
  settings.onDidChange('appSettings', (next) => {
    if (next?.autoUpdate !== false && state.status === 'available') void download();
  });
  void check();
  setInterval(() => void check(), CHECK_INTERVAL_MS);
};
