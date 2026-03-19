import { ipcMain, Notification } from 'electron';

ipcMain.handle('notification:show', async (_, title: string, body: string): Promise<void> => {
  if (Notification.isSupported()) {
    new Notification({ body, timeoutType: 'never', title }).show();
  }
});
