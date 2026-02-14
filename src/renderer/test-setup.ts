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
    getAction: vi.fn(),
    getJobs: vi.fn(),
    getPulls: vi.fn(),
    reset: vi.fn()
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
  worktree: {
    add: vi.fn(),
    list: vi.fn(),
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
