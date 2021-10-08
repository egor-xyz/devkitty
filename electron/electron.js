/* eslint-disable */
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// GET user environment PATH. Disabled slowdown app
// require('fix-path')();

const log = require('electron-log');
log.catchErrors();
log.transports.file.level = 'info';

const path = require('path');

const { BrowserWindow, app, Menu, ipcMain, autoUpdater } = require('electron');
const { is } = require('electron-util');
const isDev = require('electron-is-dev');

require('electron-unhandled')({ showDialog: isDev });

app.name = 'Devkitty';
// app.setAsDefaultProtocolClient('x-devkitty');

// set local data folder when in dev mode or running tests
if (isDev) {
  app.setPath('userData', path.resolve('./tmp'));
}

let win = null;
let splashScreen = null;
const icon = `${__dirname}/icons/icon.png`;

const createSplashScreen = function () {
  const size = 250;
  splashScreen = new BrowserWindow({
    show: false,
    transparent: true,
    frame: false,
    height: size,
    minHeight: size,
    maxHeight: size,
    width: size,
    minWidth: size,
    maxWidth: size,
    fullscreen: false,
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    movable: true,
    resizable: false,
  });

  splashScreen.loadURL(`file://${__dirname}/splashscreen.html`);

  splashScreen.on('closed', function () {
    splashScreen = null;
  });

  splashScreen.once('ready-to-show', function () {
    splashScreen.show();
  });
};

function createMainWindow() {
  const mainWindowState = require('electron-window-state')({
    defaultHeight: 600
  });

  win = new BrowserWindow({
    backgroundColor: '#282522',
    fullscreen: false,
    fullscreenable: false,
    hasShadow: true,
    height: mainWindowState.height,
    icon: icon,
    minHeight: 600,
    minWidth: 800,
    show: false,
    title: 'devkitty',
    titleBarStyle: 'hidden',
    trafficLightPosition: {
      top: 36
    },
    trafficLightPosition: { x: 16, y: 34 },
    webPreferences: {
      contextIsolation: false,
      enableRemoteModule: true,
      nodeIntegration: true,
      scrollBounce: true,
      spellcheck: false,
    },
    width: isDev ? 1326 : 800,
    x: mainWindowState.x,
    y: mainWindowState.y,
  });

  win.setRepresentedFilename('devkitty');
  // win.setDocumentEdited(true);

  if (isDev) {
    win.loadURL('http://localhost:7777');
  } else {
    const { URL } = require('url');
    const url = new URL(`file://${require('./scripts/getPath').getPath('build/index.html')}`);
    win.loadFile(url.toString());
  }

  win.on('closed', function () {
    win = null;
  });

  win.webContents.on('did-finish-load', function () {
    mainWindowState.manage(win);

    if (splashScreen) {
      splashScreen.close();
    }

    win.show();

    isDev && win.webContents.openDevTools();
  });

  if (is.macos) {
    require('./scripts/updater').startAutoUpdate(win);
  }

  require('./scripts/ipcMainHelpers').run(win);

  Menu.setApplicationMenu(Menu.buildFromTemplate(require('./scripts/menu').getAppMenu(win, app)));
}

app.on('ready', function () {
  // createSplashScreen();
  createMainWindow();
  // require('./scripts/tray').createTray(win, createWindow);
});

app.on('window-all-closed', function () {
  if (!is.macos) {
    app.quit();
  }
});

// Quit requested by renderer (when waiting for save to finish)
ipcMain.on('renderer-app-quit', function () {
  win.destroy();
});

app.on('activate', function () {
  if (win === null) {
    createMainWindow();
  }
});

app.on('open-url', function (e, url) {
  win.webContents.send('open-url', url);
});
