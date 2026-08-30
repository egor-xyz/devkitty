// Setup file for renderer tests
// This file runs before any test module is imported, so it can set up
// globals that are accessed at module evaluation time (top-level IIFEs in stores)

import { vi } from 'vitest';

// Provide a comprehensive window.bridge mock for all renderer tests
// The stores (useProjects, useGroups, useAppSettings, useDarkMode) have
// top-level IIFEs that call window.bridge.* at import time
const mockBridge = {
  darkMode: {
    on: vi.fn(),
    set: vi.fn(),
    toggle: vi.fn()
  },
  git: {
    checkout: vi.fn(),
    getStatus: vi.fn(),
    mergeTo: vi.fn(),
    pull: vi.fn(),
    reset: vi.fn()
  },
  gitAPI: {
    cancelRun: vi.fn(),
    disableAutoMerge: vi.fn().mockResolvedValue({ success: true }),
    enableAutoMerge: vi.fn().mockResolvedValue({ success: true }),
    getConflictFiles: vi.fn().mockResolvedValue({ files: [], success: true }),
    getJobs: vi.fn(),
    getOpenPulls: vi.fn(),
    getPinnedRuns: vi.fn(),
    getPRChecks: vi.fn().mockResolvedValue({
      allowedMergeMethods: [],
      autoMergeAllowed: false,
      autoMergeEnabled: false,
      behind: false,
      checks: [],
      mergeableState: 'unknown',
      review: null,
      success: true,
      unresolvedComments: 0,
      unresolvedThreads: []
    }),
    getPulls: vi.fn(),
    getRuns: vi.fn(),
    getRunsPage: vi.fn(),
    mergePR: vi.fn().mockResolvedValue({ success: true }),
    rerunFailedJobs: vi.fn(),
    rerunWorkflow: vi.fn(),
    reset: vi.fn(),
    searchRuns: vi.fn(),
    updateBranch: vi.fn().mockResolvedValue({ success: true })
  },
  launch: {
    editor: vi.fn(),
    shell: vi.fn()
  },
  projects: {
    add: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
    update: vi.fn()
  },
  settings: {
    get: vi.fn().mockResolvedValue([]),
    onAppSettings: vi.fn(),
    set: vi.fn()
  },
  sticker: {
    add: vi.fn()
  },
  window: {
    getAlwaysOnTop: vi.fn().mockResolvedValue(false),
    setAlwaysOnTop: vi.fn().mockResolvedValue(false)
  },
  worktree: {
    add: vi.fn(),
    getStatus: vi.fn(),
    list: vi.fn(),
    pull: vi.fn(),
    remove: vi.fn()
  }
};

// Set up window with bridge and matchMedia for renderer store evaluation
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    addEventListener: vi.fn(),
    bridge: mockBridge,
    clearInterval: vi.fn(),
    matchMedia: vi.fn(() => ({
      addEventListener: vi.fn(),
      matches: false,
      removeEventListener: vi.fn()
    })),
    navigator: { onLine: true },
    removeEventListener: vi.fn(),
    setInterval: vi.fn()
  },
  writable: true
});

// Also set navigator.onLine for useOnLine hook
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { onLine: true },
  writable: true
});
