import { app, BrowserWindow, nativeTheme } from 'electron';

import log from 'electron-log';

import './ipcs';
import { settings } from './settings';
import { updateAppSettings } from './utils/updateAppSettings';

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Initialize app & settings
const isDev = process.env.NODE_ENV === 'development';

log.initialize({ preload: true });

app.name = 'Devkitty';

updateAppSettings();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = (): void => {
  // restore window position and size
  const { height = 600, width = isDev ? 1326 : 800, x, y } = settings.get('windowBounds') || {};

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#141414' : '#ffffff',
    height,
    minHeight: 600,
    minWidth: 800,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 15, y: 17 },
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
    },
    width,
    x,
    y
  });

  mainWindow.on('close', () => {
    settings.set('windowBounds', mainWindow.getBounds());
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  isDev && mainWindow.webContents.openDevTools();

  // CSP interceptor
  // mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
  //   callback({
  //     responseHeaders: {
  //       ...details.responseHeaders,
  //       'Content-Security-Policy': [
  //         "script-src 'self' https://frontegg.com https://*.frontegg.com 'unsafe-eval' 'unsafe-inline'"
  //       ]
  //     }
  //   });
  // });

  // mainWindow.webContents.on('did-finish-load', () => {
  // nativeTheme.on('updated', () => {
  //   mainWindow.webContents.send('theme-changed', nativeTheme.themeSource);
  // });
  // });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.