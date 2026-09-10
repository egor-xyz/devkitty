import { BrowserWindow, ipcMain } from 'electron';
import {
  WINDOW_OPACITY_DEFAULT,
  WINDOW_OPACITY_MAX,
  WINDOW_OPACITY_MIN,
  type WindowAppearance,
  type WindowOpacity
} from 'types/window';

const isWindowOpacity = (opacity: unknown): opacity is WindowOpacity =>
  typeof opacity === 'number'
  && Number.isFinite(opacity)
  && opacity >= WINDOW_OPACITY_MIN
  && opacity <= WINDOW_OPACITY_MAX;

const fallbackAppearance = (): WindowAppearance => ({
  alwaysOnTop: false,
  opacity: WINDOW_OPACITY_DEFAULT
});

const appearanceByWindow = new WeakMap<BrowserWindow, WindowAppearance>();

const getStoredAppearance = (win: BrowserWindow): WindowAppearance => {
  const storedAppearance = appearanceByWindow.get(win);
  if (storedAppearance) return storedAppearance;

  const initialAppearance = {
    alwaysOnTop: win.isAlwaysOnTop(),
    opacity: WINDOW_OPACITY_DEFAULT
  };
  appearanceByWindow.set(win, initialAppearance);
  return initialAppearance;
};

ipcMain.handle('window:getPinnedAppearance', (event): WindowAppearance => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return fallbackAppearance();

  return getStoredAppearance(win);
});

ipcMain.handle('window:setPinnedAppearance', (
  event,
  alwaysOnTop: unknown,
  pinnedOpacity: unknown
): WindowAppearance => {
  if (typeof alwaysOnTop !== 'boolean') throw new TypeError('Invalid always-on-top flag');
  if (!isWindowOpacity(pinnedOpacity)) throw new TypeError('Invalid window opacity');

  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return fallbackAppearance();

  win.setAlwaysOnTop(alwaysOnTop, 'screen-saver');
  win.setVisibleOnAllWorkspaces(alwaysOnTop, {
    skipTransformProcessType: true,
    visibleOnFullScreen: true
  });
  win.setOpacity(alwaysOnTop ? pinnedOpacity : WINDOW_OPACITY_DEFAULT);

  const appearance = {
    alwaysOnTop,
    opacity: pinnedOpacity
  };
  appearanceByWindow.set(win, appearance);
  return appearance;
});
