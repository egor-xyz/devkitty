import { ipcMain } from 'electron';

import { track } from '../analytics';

ipcMain.handle('analytics:trackEvent', (_event, name: string, params?: Record<string, unknown>) => track(name, params));
