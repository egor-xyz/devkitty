const { ipcMain, app } = require('electron');

ipcMain.handle('getAppData', () => ({
  platform: process.platform,
  version: app.getVersion()
}));
