import { ipcMain, nativeImage, Tray } from 'electron';

let tray: null | Tray = null;

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
