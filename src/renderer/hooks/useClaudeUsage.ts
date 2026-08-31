import { subscribe, type Unsubscribe } from 'renderer/services/poller';
import { type ClaudeAccount, type ClaudeDetection, type ClaudeUsage } from 'types/claudeUsage';
import { create } from 'zustand';

import { useAppSettings } from './useAppSettings';

export const CLAUDE_POLL_MS = 60000;

type Actions = {
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  setActive: (dir: string) => void;
};

type State = {
  accounts: ClaudeAccount[];
  activeDir?: string;
  detection: ClaudeDetection;
  loading: boolean;
  ready: boolean; // detection + account discovery finished
  usage?: ClaudeUsage;
  usageByDir: Record<string, ClaudeUsage>; // last-known usage per account, kept across switches
};

const pickActive = (accounts: ClaudeAccount[], preferred?: string) => {
  if (preferred && accounts.some((a) => a.dir === preferred)) return preferred;
  return accounts[0]?.dir;
};

const claudeUsageKey = (dir: string) => `claudeUsage:${dir}`;

// The coordinator subscription is dynamic (keyed by whichever account is
// currently active), so it's managed imperatively via `subscribe()` rather
// than the React `usePoll` hook. There's at most one live subscription at a
// time; module-scoped state is enough to track it.
let unsubscribeActive: undefined | Unsubscribe;
let subscribedDir: string | undefined;

export const useClaudeUsage = create<Actions & State>((set, get) => {
  // Keeps the active account's usage fresh on the shared poller loop, which
  // already handles the recurring timer, pause-when-hidden/offline, and
  // refetch-on-visible/focus/online — this just points it at the right key
  // for whichever account is currently active.
  const subscribeToActiveDir = (dir?: string) => {
    if (dir === subscribedDir) return;

    unsubscribeActive?.();
    unsubscribeActive = undefined;
    subscribedDir = dir;
    if (!dir) return;

    unsubscribeActive = subscribe<ClaudeUsage>(
      {
        fetch: () => {
          const account = get().accounts.find((a) => a.dir === dir);
          if (!account) return Promise.reject(new Error(`No Claude account for ${dir}`));
          return window.bridge.claude.usage(account);
        },
        interval: () => CLAUDE_POLL_MS,
        key: claudeUsageKey(dir)
      },
      (usage) => {
        // Same write as `refresh()` below: always cache by the dir the fetch
        // was for, but only surface it as the active usage if that dir is
        // still active (ignores a response for a no-longer-active account).
        set((s) => ({ usageByDir: { ...s.usageByDir, [dir]: usage } }));
        if (get().activeDir !== dir) return;
        set({ loading: false, usage });
      }
    );
  };

  return {
    accounts: [],
    detection: { installed: false },
    init: async () => {
      const [detection, accounts, appSettings] = await Promise.all([
        window.bridge.claude.detect(),
        window.bridge.claude.accounts(),
        window.bridge.settings.get('appSettings')
      ]);

      const activeDir = pickActive(accounts, appSettings?.claudeAccountDir);
      set({ accounts, activeDir, detection, ready: true });

      if (activeDir) await get().refresh();
      subscribeToActiveDir(activeDir);
    },
    loading: false,
    ready: false,
    refresh: async () => {
      const { accounts, activeDir, usageByDir } = get();
      const account = accounts.find((a) => a.dir === activeDir);
      if (!account) return;

      // Only show the spinner on a true first fetch; a switch back to an account
      // we already have data for refreshes silently behind the cached view.
      if (!usageByDir[account.dir]) set({ loading: true });

      const usage = await window.bridge.claude.usage(account);
      set((s) => ({ usageByDir: { ...s.usageByDir, [account.dir]: usage } }));

      // Ignore a response that arrives after the user switched accounts.
      if (get().activeDir !== account.dir) return;
      set({ loading: false, usage });
    },
    setActive: (dir) => {
      if (dir === get().activeDir) return;

      // Show the remembered data for this account instantly; refresh in the
      // background so a re-click (1 → 2 → 1) never blanks or re-blocks the UI.
      const cached = get().usageByDir[dir];
      set({ activeDir: dir, loading: !cached, usage: cached });
      useAppSettings.getState().set({ claudeAccountDir: dir });
      void get().refresh();
      subscribeToActiveDir(dir);
    },
    usage: undefined,
    usageByDir: {}
  };
});

void useClaudeUsage.getState().init();

/**
 * Retained for backward compatibility with existing call sites (e.g.
 * `ClaudeFooter`). Polling is now owned by the shared poller coordinator —
 * subscribed directly inside this store by `init`/`setActive` (see
 * `subscribeToActiveDir` above) rather than by component mount — so this
 * hook no longer has any work of its own to do.
 */
export const useClaudeUsagePolling = (): void => {};

/** Test-only: clears the module-scoped subscription tracking between tests. */
export const __resetClaudeUsagePollingForTests = (): void => {
  unsubscribeActive?.();
  unsubscribeActive = undefined;
  subscribedDir = undefined;
};
