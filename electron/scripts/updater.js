const { app, powerMonitor, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');

const appVersion = app.getVersion();
const UPDATE_INTERVAL = (1000 * 60) * 15;
let ready = false;
let intervalID;

function setTimer(mainWindow) {
  if (intervalID) clearInterval(intervalID);
  intervalID = setInterval(() => {
    try {
      mainWindow.webContents.send('updater', { msg: 'Interval' });
      autoUpdater.checkForUpdatesAndNotify();
    } catch (e) { /**/ }
  }, UPDATE_INTERVAL);
}

function clearTimer() {
  if (intervalID) clearInterval(intervalID);
}

function onPowerMonitor(mainWindow) {
  powerMonitor.on('suspend', clearTimer);
  powerMonitor.on('lock-screen', clearTimer);

  powerMonitor.on('resume', () => {
    setTimer(mainWindow);
  });
}

function startAutoUpdate(mainWindow) {
  mainWindow.webContents.send('console', `🖥 App version: ${appVersion}`);
  mainWindow.webContents.send('message', { msg: `🖥 App version: ${appVersion}` });

  if (ready || require('electron-is-dev')) return;
  ready = true;

  autoUpdater.on('error', (ev, err) => {
    mainWindow.webContents.send('updater', { msg: `Error: ${err}` });
  });

  autoUpdater.once('checking-for-update', (ev, err) => {
    mainWindow.webContents.send('updater', { err, ev, msg: '🔎 Checking for updates' });
  });

  autoUpdater.once('update-available', (ev, err) => {
    clearTimer();
    mainWindow.webContents.send('updater', { err, ev, msg: '🎉 Update available. Downloading ⌛️' });
  });

  autoUpdater.once('update-not-available', (ev, err) => {
    mainWindow.webContents.send('updater', { err, ev, msg: '👎 Update not available' });
  });

  autoUpdater.once('update-downloaded', (ev, err) => {
    mainWindow.webContents.send('updater', {
      err,
      msg: '🚀 Update downloaded',
      type: 'Downloaded',
      version: ev.releaseName
    });
  });

  autoUpdater.checkForUpdatesAndNotify();

  setTimer(mainWindow);

  onPowerMonitor(mainWindow);

  ipcMain.on('quitAndInstall', function () {
    autoUpdater.quitAndInstall();
  });
}

module.exports = { startAutoUpdate };