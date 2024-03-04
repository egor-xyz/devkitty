import { app, nativeTheme } from 'electron';
import path from 'path';

import Store from 'electron-store';

import { Settings } from 'types/settings';

const isDev = process.env.NODE_ENV === 'development';

export const settings = new Store<Settings>({
  beforeEachMigration: (store, context) => {
    console.log(`[main-config] migrate from ${context.fromVersion} → ${context.toVersion}`);
  },
  cwd: isDev ? path.resolve('..', app.getAppPath()) : app.getPath('userData'),
  defaults: {
    appSettings: {
      editors: [],
      fetchInterval: 10000,
      projectActionCollapsed: true,
      shells: [],
      showLogo: true,
      soundEffects: true
    },
    collapsedGroups: [],
    groupAliases: [],
    projects: [],
    selectedGroups: [],
    themeSource: 'system',
    windowBounds: {
      height: 600,
      width: isDev ? 1426 : 800,
      x: 0,
      y: 0
    }
  },
  migrations: {},
  name: 'devkitty.settings'
});

// Init default values
nativeTheme.themeSource = settings.get('themeSource') ?? 'system';
