/* eslint-disable */
// Demo bridge: a full drop-in for the real `window.bridge`, returning the fake
// data in ./data. Selected in preload only when DK_DEMO=1. No git, no network —
// every method resolves with a canned value. The one exception is the `window`
// namespace: always-on-top is a real OS action (not data), so it still goes
// through IPC so the pin works while demoing.

import { ipcRenderer } from 'electron';
import { type PRStatus } from 'types/gitHub';
import { type UpdateState } from 'types/update';
import { type WindowOpacity } from 'types/window';

import {
  authoredPRNumbers,
  claudeAccounts,
  codexAccounts,
  codexUsageByDir,
  conflictFilesByPR,
  cursorAccounts,
  cursorUsageByDir,
  gitStatusById,
  groups,
  jobsForRun,
  prChecksByPR,
  projects,
  pullsById,
  reviewRequestedPRNumbers,
  runsById,
  usageByDir
} from './data';

// Mutable so in-session toggles (theme, worktrees, account switch) stick.
const store: Record<string, any> = {
  appSettings: {
    aiProvider: 'both',
    claudeAccountDir: claudeAccounts[0].dir,
    claudeEnabled: true,
    codexAccountDir: codexAccounts[0].dir,
    editors: [{ editor: 'Visual Studio Code', name: 'Visual Studio Code', path: '/Applications/Visual Studio Code.app' }],
    fetchInterval: 15000,
    gitHubActions: { all: true, count: 5, ignoreDependabot: false, ignoredWorkflows: [], notifications: true, pinnedWorkflows: [] },
    gitHubPulls: { pollInterval: 300000 },
    gitHubToken: 'demo-token',
    selectedEditor: { editor: 'Visual Studio Code', name: 'Visual Studio Code', path: '/Applications/Visual Studio Code.app' },
    selectedShell: { name: 'Terminal', shell: 'Terminal' },
    shells: [{ name: 'Terminal', shell: 'Terminal' }],
    showClaudeUsage: true,
    showLogo: true,
    showWorktrees: true,
    theme: 'sunset'
  },
  collapsedGroups: [],
  newGroups: groups,
  projects,
  themeSource: 'system'
};
const savedAdminKeys = { anthropic: false, openai: false };

const ok = <T extends Record<string, unknown> = Record<never, never>>(extra: T = {} as T) => Promise.resolve({ success: true as const, ...extra });
const noop = () => Promise.resolve();
const emptyPRStatus: PRStatus = {
  allowedMergeMethods: [],
  autoMergeAllowed: false,
  autoMergeEnabled: false,
  behind: false,
  checks: [],
  mergeable: false,
  mergeableState: 'unknown',
  review: null,
  success: true,
  unresolvedComments: 0,
  unresolvedThreads: [],
  workflowRuns: []
};

export const demoBridge = {
  aiUsageCredentials: {
    clear: (provider: 'anthropic' | 'openai') => {
      savedAdminKeys[provider] = false;
      return Promise.resolve();
    },
    set: (provider: 'anthropic' | 'openai', value: string) => {
      if (!value.trim()) return Promise.reject(new Error('Invalid admin key'));
      savedAdminKeys[provider] = true;
      return Promise.resolve();
    },
    status: () => Promise.resolve({ ...savedAdminKeys })
  },
  analytics: {
    trackEvent: noop
  },
  claude: {
    accounts: () => Promise.resolve(claudeAccounts),
    detect: () => Promise.resolve({ installed: true, version: '2.0.14' }),
    usage: (account: { dir: string }) => Promise.resolve(usageByDir[account.dir as keyof typeof usageByDir] ?? usageByDir[claudeAccounts[0].dir as keyof typeof usageByDir])
  },
  clipboard: {
    onDownscaled: () => () => {}
  },
  codex: {
    accounts: () => Promise.resolve(codexAccounts),
    detect: () => Promise.resolve({ installed: true, version: '0.111.0' }),
    usage: (account: { dir: string }) => {
      const usage = codexUsageByDir[account.dir];
      return usage ? Promise.resolve(usage) : Promise.reject(new Error('Unknown Codex profile'));
    }
  },
  cursor: {
    accounts: () => Promise.resolve(cursorAccounts),
    detect: () => Promise.resolve({ installed: true, surfaces: ['ide', 'cli', 'grok-bot'], version: '1.7.0' }),
    usage: (account: { dir: string }) => {
      const usage = cursorUsageByDir[account.dir as keyof typeof cursorUsageByDir];
      return usage ? Promise.resolve(usage) : Promise.reject(new Error('Unknown Cursor account'));
    }
  },
  darkMode: {
    on: noop,
    set: noop,
    toggle: noop
  },
  git: {
    checkout: () => ok({ message: 'Switched branch' }),
    getStatus: (id: string) => Promise.resolve(gitStatusById[id] ?? { success: false, message: 'Not found' }),
    mergeTo: () => ok({ merges: [], message: 'Merged' }),
    pull: () => ok({ message: 'Already up to date' }),
    reset: () => ok({ message: 'Reset' })
  },
  gitAPI: {
    cancelRun: () => ok(),
    disableAutoMerge: () => ok({ message: 'Auto-merge disabled' }),
    enableAutoMerge: () => ok({ message: 'Auto-merge enabled' }),
    getConflictFiles: (_id: string, prNumber: number) => ok({ files: conflictFilesByPR[prNumber] ?? [] }),
    getJobs: (_id: string, runId: number) => ok({ jobs: jobsForRun(runId) }),
    getOpenPulls: (id: string) => ok({ pulls: pullsById[id] ?? [] }),
    getPinnedRuns: () => ok({ runs: [] }),
    getPRChecks: (_id: string, prNumber: number) => Promise.resolve(prChecksByPR[prNumber] ?? emptyPRStatus),
    getPulls: (id: string, type: string) => {
      const nums = type === 'author' ? authoredPRNumbers[id] : type === 'review-requested' ? reviewRequestedPRNumbers[id] : [];
      return ok({ pulls: (nums ?? []).map((number) => ({ number })) });
    },
    getRuns: (id: string) => ok({ runs: runsById[id] ?? [] }),
    getRunsPage: () => ok({ last: true, runs: [] }),
    mergePR: () => ok({ message: 'Pull request merged' }),
    rerunFailedJobs: () => ok(),
    rerunWorkflow: () => ok(),
    reset: () => ok({ message: 'Branch reset' }),
    searchRuns: () => ok({ runs: [] }),
    updateBranch: () => ok({ message: 'Branch updated' })
  },
  launch: {
    editor: noop,
    shell: noop
  },
  notification: {
    show: noop
  },
  projects: {
    add: () => Promise.resolve({ canceled: true, success: false }),
    get: () => Promise.resolve(store.projects),
    remove: () => Promise.resolve(store.projects),
    update: () => Promise.resolve(store.projects)
  },
  settings: {
    get: (key: string) => Promise.resolve(store[key]),
    onAppSettings: noop,
    set: (key: string, value: any) => {
      store[key] = key === 'appSettings' ? { ...store[key], ...value } : value;
      return Promise.resolve();
    }
  },
  sticker: {
    add: noop
  },
  updater: {
    download: noop,
    getState: () => Promise.resolve({ status: 'idle' as const }),
    install: noop,
    onState: (_callback: (state: UpdateState) => void) => () => {}
  },
  window: {
    getPinnedAppearance: () => ipcRenderer.invoke('window:getPinnedAppearance'),
    setPinnedAppearance: (alwaysOnTop: boolean, pinnedOpacity: WindowOpacity) =>
      ipcRenderer.invoke('window:setPinnedAppearance', alwaysOnTop, pinnedOpacity)
  },
  worktree: {
    add: () => ok({ message: 'Worktree added' }),
    getStatus: () => ok({ status: { ahead: 0, behind: 0, modified: [] } }),
    list: (id: string) => ok({ worktrees: gitStatusById[id]?.worktrees ?? [] }),
    pull: () => ok({ message: 'Up to date' }),
    remove: () => ok({ message: 'Worktree removed' })
  }
};
