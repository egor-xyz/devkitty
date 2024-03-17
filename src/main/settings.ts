import { app, nativeTheme } from 'electron';
import path from 'path';

import Store from 'electron-store';

import { Settings } from 'types/settings';

const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
  app.setPath('userData', path.resolve('.'));
}

export const settings = new Store<Settings>({
  beforeEachMigration: (store, context) => {
    console.log(`[main-config] migrate from ${context.fromVersion} → ${context.toVersion}`);
  },
  defaults: {
    appSettings: {
      editors: [],
      fetchInterval: 10000,
      gitHubActions: {
        all: true,
        count: 3,
        inProgress: false
      },
      shells: [],
      showLogo: true,
      soundEffects: true
    },
    collapsedGroups: [],
    newGroups: [],
    projects: [],
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
