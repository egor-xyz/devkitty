import { app, BrowserWindow, BrowserWindowConstructorOptions, nativeTheme, shell } from 'electron';
import path from 'path';

import electronWindowState from 'electron-window-state';
import log from 'electron-log';
import { updateElectronApp } from 'update-electron-app';

import './ipcs';
import { updateEditorsAndShells } from './libs/integrations/integrations';

log.initialize({ preload: true, spyRendererConsole: false });

updateElectronApp({
  logger: log,
  updateInterval: '5 minutes'
});

app.name = 'Devkitty';

const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
  app.setPath('userData', path.resolve('./.tmp'));
}

const createWindow = (): void => {
  const mainWindowState = electronWindowState({
    defaultHeight: 600,
    defaultWidth: isDev ? 1426 : 800
  });

  const mainWindow = new BrowserWindow({
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#141414' : '#ffffff',

    height: mainWindowState.height,
    minHeight: 600,
    minWidth: 800,
    show: isDev ? false : true,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 15, y: 17 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    width: mainWindowState.width,
    x: mainWindowState.x,
    y: mainWindowState.y
  });

  mainWindowState.manage(mainWindow);

  // all external links should open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  updateEditorsAndShells(mainWindow);

  if (isDev) {
    setTimeout(() => {
      mainWindow.showInactive();
      mainWindow.webContents.openDevTools();
    }, 500);
  }

  // CSP interceptor
  // mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
  //   callback({
  //     responseHeaders: {
  //       ...details.responseHeaders,
  //       'Content-Security-Policy': [
  //         "script-src 'self' https://example.com https://*.example.com 'unsafe-eval' 'unsafe-inline'"
  //       ]
  //     }
  //   });
  // });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
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
  // if (process.platform !== 'darwin') {
  app.quit();
  // }
});
