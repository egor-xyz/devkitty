import { type ClaudeAccount, type ClaudeUsage } from 'types/claudeUsage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// `useClaudeUsage.ts` calls `window.bridge.claude.*` and `window.bridge.settings.get`
// in a top-level `void useClaudeUsage.getState().init()` that runs the instant the
// module is evaluated. The global test-setup.ts already stubs `window.bridge`, but it
// doesn't know about the `claude` namespace, so that namespace has to be grafted on
// *before* `./useClaudeUsage` is imported below. Static imports are hoisted above plain
// statements, but `vi.hoisted` callbacks run before that hoisted import, so the mutation
// belongs there.
const { accountsMock, appSettingsSetMock, detectMock, settingsGetMock, usageMock } = vi.hoisted(() => {
  // The module's top-level `init()` call fires the instant it's imported below,
  // long before any test's `beforeEach` runs, so these need harmless resolved
  // defaults up front to avoid an unhandled rejection during import.
  const accountsMock = vi.fn().mockResolvedValue([]);
  const detectMock = vi.fn().mockResolvedValue({ installed: false });
  const usageMock = vi.fn().mockResolvedValue(undefined);
  const settingsGetMock = vi.fn().mockResolvedValue({});
  const appSettingsSetMock = vi.fn();

  const existingWindow = (globalThis as { window?: { bridge?: Record<string, unknown> } }).window;

  (globalThis as unknown as { window: unknown }).window = {
    ...existingWindow,
    bridge: {
      ...existingWindow?.bridge,
      claude: { accounts: accountsMock, detect: detectMock, usage: usageMock },
      settings: { ...(existingWindow?.bridge?.settings as Record<string, unknown>), get: settingsGetMock }
    }
  };

  return { accountsMock, appSettingsSetMock, detectMock, settingsGetMock, usageMock };
});

vi.mock('./useAppSettings', () => ({
  useAppSettings: {
    getState: () => ({ set: appSettingsSetMock })
  }
}));

import { CLAUDE_POLL_MS, useClaudeUsage } from './useClaudeUsage';

const accountA: ClaudeAccount = { dir: '/Users/x/.claude', label: 'claude' };
const accountB: ClaudeAccount = { dir: '/Users/x/.claude-b', label: 'claude-b' };

const makeUsage = (account: ClaudeAccount): ClaudeUsage => ({
  account,
  computedAt: 1000,
  fiveHour: {
    active: true,
    cap: 100,
    models: [],
    pct: 0.1,
    reported: true,
    resetsAt: 2000,
    startsAt: 1000,
    tokens: 10
  },
  week: {
    active: true,
    cap: 1000,
    models: [],
    pct: 0.2,
    reported: true,
    resetsAt: 3000,
    startsAt: 1000,
    tokens: 200
  }
});

const resetStore = () => {
  useClaudeUsage.setState({
    accounts: [],
    activeDir: undefined,
    detection: { installed: false },
    loading: false,
    ready: false,
    usage: undefined,
    usageByDir: {}
  });
};

describe('useClaudeUsage store', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Sensible defaults so any call that isn't overridden per-test resolves cleanly.
    detectMock.mockResolvedValue({ installed: true, version: '1.0.0' });
    accountsMock.mockResolvedValue([]);
    settingsGetMock.mockResolvedValue({});
    usageMock.mockResolvedValue(undefined);

    resetStore();
  });

  describe('init', () => {
    it('populates accounts, active dir, detection and ready, and triggers a refresh when an account is active', async () => {
      const detection = { installed: true, version: '2.1.0' };
      const usage = makeUsage(accountA);

      detectMock.mockResolvedValue(detection);
      accountsMock.mockResolvedValue([accountA, accountB]);
      settingsGetMock.mockResolvedValue({});
      usageMock.mockResolvedValue(usage);

      await useClaudeUsage.getState().init();

      const state = useClaudeUsage.getState();
      expect(state.accounts).toEqual([accountA, accountB]);
      expect(state.activeDir).toBe(accountA.dir);
      expect(state.detection).toEqual(detection);
      expect(state.ready).toBe(true);
      expect(usageMock).toHaveBeenCalledWith(accountA);
      expect(state.usage).toEqual(usage);
      expect(state.usageByDir[accountA.dir]).toEqual(usage);
    });

    it('sets ready to true and leaves no active dir when there are zero accounts', async () => {
      accountsMock.mockResolvedValue([]);
      settingsGetMock.mockResolvedValue({});

      await useClaudeUsage.getState().init();

      const state = useClaudeUsage.getState();
      expect(state.ready).toBe(true);
      expect(state.activeDir).toBeUndefined();
      expect(usageMock).not.toHaveBeenCalled();
    });

    it('prefers the account matching the stored claudeAccountDir over the first account', async () => {
      accountsMock.mockResolvedValue([accountA, accountB]);
      settingsGetMock.mockResolvedValue({ claudeAccountDir: accountB.dir });
      usageMock.mockResolvedValue(makeUsage(accountB));

      await useClaudeUsage.getState().init();

      expect(useClaudeUsage.getState().activeDir).toBe(accountB.dir);
    });

    it('falls back to the first account when the stored claudeAccountDir does not match any account', async () => {
      accountsMock.mockResolvedValue([accountA, accountB]);
      settingsGetMock.mockResolvedValue({ claudeAccountDir: '/no/such/dir' });
      usageMock.mockResolvedValue(makeUsage(accountA));

      await useClaudeUsage.getState().init();

      expect(useClaudeUsage.getState().activeDir).toBe(accountA.dir);
    });
  });

  describe('refresh', () => {
    it('returns early without calling the bridge when no account matches the active dir', async () => {
      useClaudeUsage.setState({
        accounts: [accountA],
        activeDir: '/no/such/dir',
        usageByDir: {}
      });

      await useClaudeUsage.getState().refresh();

      expect(usageMock).not.toHaveBeenCalled();
      expect(useClaudeUsage.getState().loading).toBe(false);
    });

    it('stores the fetched usage in usageByDir and sets it as the active usage', async () => {
      const usage = makeUsage(accountA);
      usageMock.mockResolvedValue(usage);

      useClaudeUsage.setState({
        accounts: [accountA],
        activeDir: accountA.dir,
        usage: undefined,
        usageByDir: {}
      });

      await useClaudeUsage.getState().refresh();

      const state = useClaudeUsage.getState();
      expect(state.usageByDir[accountA.dir]).toEqual(usage);
      expect(state.usage).toEqual(usage);
      expect(state.loading).toBe(false);
    });

    it('ignores a usage response that arrives after the active account has changed', async () => {
      const staleUsage = makeUsage(accountA);
      let resolveUsage: (value: ClaudeUsage) => void = () => {};
      usageMock.mockImplementation(
        () =>
          new Promise<ClaudeUsage>((resolve) => {
            resolveUsage = resolve;
          })
      );

      useClaudeUsage.setState({
        accounts: [accountA, accountB],
        activeDir: accountA.dir,
        usage: undefined,
        usageByDir: {}
      });

      const refreshPromise = useClaudeUsage.getState().refresh();

      // The user switches accounts while the fetch for accountA is still in flight.
      useClaudeUsage.setState({ activeDir: accountB.dir });
      resolveUsage(staleUsage);

      await refreshPromise;

      const state = useClaudeUsage.getState();
      // The stale fetch is still cached against its own account...
      expect(state.usageByDir[accountA.dir]).toEqual(staleUsage);
      // ...but it must not clobber the now-active account's displayed usage or loading flag.
      expect(state.usage).toBeUndefined();
      expect(state.activeDir).toBe(accountB.dir);
    });
  });

  describe('setActive', () => {
    it('switches the active dir, persists the choice, and refreshes usage for the newly active account', async () => {
      const usage = makeUsage(accountB);
      usageMock.mockResolvedValue(usage);

      useClaudeUsage.setState({
        accounts: [accountA, accountB],
        activeDir: accountA.dir,
        usage: makeUsage(accountA),
        usageByDir: {}
      });

      useClaudeUsage.getState().setActive(accountB.dir);

      expect(useClaudeUsage.getState().activeDir).toBe(accountB.dir);
      expect(appSettingsSetMock).toHaveBeenCalledWith({ claudeAccountDir: accountB.dir });

      await vi.waitFor(() => {
        expect(usageMock).toHaveBeenCalledWith(accountB);
        expect(useClaudeUsage.getState().usage).toEqual(usage);
      });
    });

    it('does nothing when asked to switch to the account that is already active', () => {
      useClaudeUsage.setState({
        accounts: [accountA],
        activeDir: accountA.dir,
        usageByDir: {}
      });

      useClaudeUsage.getState().setActive(accountA.dir);

      expect(appSettingsSetMock).not.toHaveBeenCalled();
      expect(usageMock).not.toHaveBeenCalled();
    });
  });

  it('polls at a fixed one-minute interval', () => {
    expect(CLAUDE_POLL_MS).toBe(60000);
  });
});
