import { BrowserWindow, ipcMain } from 'electron';

// Keep the app window pinned above every other window (all spaces / full-screen
// too), toggled from the navbar. `screen-saver` level floats over full-screen
// apps, which the default `floating` level does not.
ipcMain.handle('window:setAlwaysOnTop', (event, flag: boolean) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return false;

  win.setAlwaysOnTop(flag, 'screen-saver');
  win.setVisibleOnAllWorkspaces(flag, { visibleOnFullScreen: true });
  return win.isAlwaysOnTop();
});

ipcMain.handle('window:getAlwaysOnTop', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win ? win.isAlwaysOnTop() : false;
});
