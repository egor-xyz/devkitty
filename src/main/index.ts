import { is } from '@electron-toolkit/utils';
import { app, BrowserWindow, nativeTheme, session, shell } from 'electron';
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

const installReactDevTools = async () => {
  const reactDevToolsId = 'fmkadmapgofadopljbjfkapdkoienihi';
  const extensionPath = path.join(app.getPath('userData'), 'extensions', reactDevToolsId);

  try {
    await session.defaultSession.extensions.loadExtension(extensionPath);
  } catch {
    log.info('React DevTools not found, skipping installation');
  }
};

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
  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
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

app.on('ready', async () => {
  if (isDev) await installReactDevTools();

  createWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
