import { screen, type Rectangle, type BrowserWindow } from 'electron';

import { settings } from '../../main/settings';

const getArea = (bounds: Rectangle) => {
  return screen.getDisplayMatching(bounds).workArea;
};

const isSizeValid = (bounds: Rectangle) => {
  const area = getArea(bounds);
  return bounds.width <= area.width && bounds.height <= area.height;
};

const isPositionValid = (bounds: Rectangle) => {
  const area = getArea(bounds);

  return (
    bounds.x >= area.x &&
    bounds.y >= area.y &&
    bounds.x + bounds.width <= area.x + area.width &&
    bounds.y + bounds.height <= area.y + area.height
  );
};

export const loadWindowState = () => {
  const bounds = settings.get('windowBounds');

  const positionValid = isPositionValid(bounds);
  const sizeValid = isSizeValid(bounds);

  if (!positionValid || !sizeValid) {
    const area = getArea(bounds);
    bounds.x = area.x + (area.width - bounds.width) / 2;
    bounds.y = area.y + (area.height - bounds.height) / 2;
  }

  return bounds;
};

export const saveBounds = (mainWindow: BrowserWindow) => {
  settings.set('windowBounds', mainWindow.getBounds());
};
