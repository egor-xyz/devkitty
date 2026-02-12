import { app, BrowserWindow, nativeTheme, shell } from 'electron';
import { is } from '@electron-toolkit/utils';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import log from 'electron-log';
import path from 'path';
import { updateElectronApp } from 'update-electron-app';

import './ipcs';
import { updateEditorsAndShells } from './libs/integrations/integrations';
import { loadWindowState, saveBounds } from './libs/window';

log.initialize({ preload: true, spyRendererConsole: false });

updateElectronApp({
  logger: log,
  updateInterval: '5 minutes'
});

app.name = 'Devkitty';

const isDev = is.dev;

const devBounds = () => (isDev ? { height: 600, width: 1426 } : {});

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#141414' : '#ffffff',
    minHeight: 600,
    minWidth: 800,
    show: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 15, y: 17 },
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      sandbox: false
    },
    ...loadWindowState(),
    ...devBounds()
  });

  // all external links should open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // and load the index.html of the app.
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  updateEditorsAndShells(mainWindow);

  mainWindow.on('close', () => {
    if (!isDev && mainWindow.webContents.isDevToolsOpened()) return;
    saveBounds(mainWindow);
  });

  mainWindow.once('ready-to-show', () => {
    if (!isDev) {
      mainWindow.show();
      return;
    }

    setTimeout(() => {
      mainWindow.showInactive();
      mainWindow.webContents.openDevTools();
    }, 500);
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDev) await installExtension(REACT_DEVELOPER_TOOLS);

  createWindow();
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
