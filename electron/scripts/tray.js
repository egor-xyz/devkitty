const getIcon = (darkMode) => require('path').join(__dirname, '..', `icons/${darkMode ? 'tray_dark' : 'tray_light'}.png`);

let tray;
function createTray(win, createWindow) {
  const { app, Tray, ipcMain, systemPreferences } = require('electron');
  const { is, darkMode } = require('electron-util');

  if (!is.macos) return;
  tray = new Tray(getIcon(darkMode.isEnabled));

  tray.setToolTip(`devkitty (${app.getVersion()})`);

  tray.on('click', () => {
    if (win === null) {
      createWindow();
      return;
    }

    win.isVisible()
      ? win.minimize()
      : win.restore()
    ;
  });

  ipcMain.on('online-status-changed', (event, online) => {
    if (tray) tray.setTitle(online ? '' : ' offline');
  });

  systemPreferences.subscribeNotification('AppleInterfaceThemeChangedNotification', () => {
    tray.setImage(getIcon(!darkMode.isEnabled));
  });
}

module.exports = { createTray };