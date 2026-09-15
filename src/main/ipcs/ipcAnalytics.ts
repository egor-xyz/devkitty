import { ipcMain } from 'electron';

import { track } from '../analytics';

type PageView = {
  page_location: string;
  page_title: string;
};

const isSafePageView = (params: unknown): params is PageView => {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return false;

  const pageView = params as Record<string, unknown>;
  if (Object.keys(pageView).length !== 2) return false;

  return (
    (pageView.page_title === 'Projects' && pageView.page_location === 'https://devkitty.app/app')
    || (pageView.page_title === 'Settings' && pageView.page_location === 'https://devkitty.app/app/settings')
  );
};

ipcMain.handle('analytics:trackEvent', (_event, name: unknown, params?: unknown) => {
  if (name !== 'page_view' || !isSafePageView(params)) {
    throw new Error('Invalid Analytics event');
  }

  return track(name, params);
});
