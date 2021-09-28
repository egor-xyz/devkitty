const { ipcMain, app, powerMonitor, dialog } = require('electron');

const run = (win) => {
  ipcMain.handle('getAppData', () => ({
    platform: process.platform,
    version: app.getVersion()
  }));

  ipcMain.handle('getAppPath', async (_, identifier) => {
    try {
      const appPath = require('app-path');
      return await appPath(identifier);
    } catch (e) {
      return;
    }
  });

  ipcMain.handle('translate', async (_, { settings, text, lang }) => {
    const { Translate } = require('@google-cloud/translate').v2;
    const translate = new Translate(settings);
    const [translations] = await translate.translate(text, lang);
    return translations;
  });

  ipcMain.handle('showOpenFolderDialog', async () => {
    const { filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (!filePaths.length) return;
    return filePaths[0];
  });

  powerMonitor.on('resume', () => {
    win.webContents.send('onPowerMonitor', 'resume');
  });

  powerMonitor.on('suspend', () => {
    win.webContents.send('onPowerMonitor', 'suspend');
  });
};

module.exports = { run };