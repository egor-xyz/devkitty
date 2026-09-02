// Setup file for renderer tests
// This file runs before any test module is imported, so it can set up
// globals that are accessed at module evaluation time (top-level IIFEs in stores)

import { vi } from 'vitest';

// Provide a comprehensive window.bridge mock for all renderer tests
// The stores (useProjects, useGroups, useAppSettings, useDarkMode) have
// top-level IIFEs that call window.bridge.* at import time
const mockBridge = {
  clipboard: {
    onDownscaled: vi.fn(() => () => {})
  },
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

// Augment window rather than replace it. In the node env there is no window, so
// we create a plain stub; under jsdom (`// @vitest-environment jsdom`) a real
// window/document already exists and must be kept intact so React hooks can
// mount — we only attach the bridge and fill any gaps.
const g = globalThis as unknown as {
  navigator?: { onLine: boolean };
  window?: Record<string, unknown>;
};

if (!g.window) {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      addEventListener: vi.fn(),
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
}

// Every renderer store/hook reads window.bridge at import time.
(g.window as Record<string, unknown>).bridge = mockBridge;
if (!(g.window as Record<string, unknown>).matchMedia) {
  (g.window as Record<string, unknown>).matchMedia = vi.fn(() => ({
    addEventListener: vi.fn(),
    matches: false,
    removeEventListener: vi.fn()
  }));
}

// useOnLine reads navigator.onLine. jsdom provides a real navigator; node does not.
if (!g.navigator) {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { onLine: true },
    writable: true
  });
}
