import { is } from '@electron-toolkit/utils';
import { app, nativeTheme } from 'electron';
import Store from 'electron-store';
import path from 'path';
import { type Settings } from 'types/settings';

const isDev = is.dev;

// Set userData path BEFORE creating store
if (isDev) {
  app.setPath('userData', path.resolve('./.tmp'));
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
      showLogo: true
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
