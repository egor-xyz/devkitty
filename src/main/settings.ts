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

// Retire the unused Admin API keys without reading or decrypting them.
try {
  const retiredSecrets = new Store({ name: 'devkitty.ai-usage-secrets' });
  retiredSecrets.delete('anthropic');
  retiredSecrets.delete('openai');
} catch {
  // A damaged or inaccessible retired store must not prevent startup.
}

export const settings = new Store<Settings>({
  beforeEachMigration: (store, context) => {
    console.log(`[main-config] migrate from ${context.fromVersion} → ${context.toVersion}`);
  },
  defaults: {
    appSettings: {
      autoUpdate: true,
      claudeEnabled: true,
      clipboardDownscale: false,
      editors: [],
      fetchInterval: 10000,
      gitHubActions: {
        all: true,
        count: 5,
        ignoreDependabot: false,
        ignoredWorkflows: [],
        notifications: true,
        pinnedWorkflows: []
      },
      gitHubPulls: {
        pollInterval: 300000
      },
      shells: [],
      showClaudeUsage: false,
      telemetry: true,
      theme: 'sunset'
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
