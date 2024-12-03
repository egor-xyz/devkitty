import { ipcMain, Menu, Tray, nativeImage, BrowserWindow } from 'electron';
import log from 'electron-log';

let tray: Tray | null = null;

ipcMain.handle('sticker:add', async (_, text: string): Promise<void> => {
  if (tray) tray.destroy();

  const trayIcon = nativeImage.createEmpty();
  tray = new Tray(trayIcon);
  tray.setTitle(text, { fontType: 'monospaced' });
  tray.setToolTip('Devkitty. Click to remove sticker.');

  tray.on('click', () => {
    if (tray) {
      tray.destroy();
      tray = null;
    }
  });
});
