import { BrowserWindow, ipcMain } from 'electron';

// Keep the app window pinned above every other window (all spaces / full-screen
// too), toggled from the navbar. `screen-saver` level floats over full-screen
// apps, which the default `floating` level does not.
ipcMain.handle('window:setAlwaysOnTop', (event, flag: boolean) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return false;

  win.setAlwaysOnTop(flag, 'screen-saver');
  // skipTransformProcessType: setVisibleOnAllWorkspaces otherwise flips the app
  // between UIElement/Foreground process types on macOS, which drops the Dock
  // icon (electron/electron#26350). Skipping the transform keeps the icon put.
  win.setVisibleOnAllWorkspaces(flag, {
    skipTransformProcessType: true,
    visibleOnFullScreen: true,
  });
  // Report back the flag we applied, not isAlwaysOnTop() — on macOS the latter
  // can momentarily read false right after setVisibleOnAllWorkspaces, which
  // would leave the navbar toggle stuck looking off.
  return flag;
});

ipcMain.handle('window:getAlwaysOnTop', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win ? win.isAlwaysOnTop() : false;
});
