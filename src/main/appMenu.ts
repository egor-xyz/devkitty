import { app, BrowserWindow, dialog, Menu, type MenuItemConstructorOptions } from 'electron';

import { checkForUpdatesManually } from './ipcs/ipcUpdater';

const focusWindow = (): BrowserWindow | undefined => {
  const window = BrowserWindow.getFocusedWindow()
    ?? BrowserWindow.getAllWindows().find((candidate) => !candidate.isDestroyed());
  if (window) {
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  }
  return window;
};

const showResult = async (title: string, message: string, detail?: string, type: 'error' | 'info' = 'info'): Promise<void> => {
  const window = focusWindow();
  const options = { buttons: ['OK'], detail, message, title, type };
  if (window) await dialog.showMessageBox(window, options);
  else await dialog.showMessageBox(options);
};

const checkForUpdates = async (): Promise<void> => {
  try {
    const state = await checkForUpdatesManually();
    if (state === 'unsupported') {
      await showResult('Updates unavailable', 'Check for updates in an installed macOS app.');
    } else if (state.status === 'error') {
      await showResult('Update check failed', 'Devkitty could not check for updates.', state.error, 'error');
    } else if (state.status === 'idle') {
      await showResult('No updates available', 'Devkitty is up to date.');
    } else {
      focusWindow();
    }
  } catch (error) {
    await showResult('Update check failed', 'Devkitty could not check for updates.', String(error), 'error');
  }
};

export const installAppMenu = (): void => {
  if (process.platform !== 'darwin') return;

  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { click: () => { void checkForUpdates(); }, label: 'Check For Updates...' },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    { role: 'help', submenu: [] }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};
