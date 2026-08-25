import { useEffect } from 'react';
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

export const useClaudeUsage = create<Actions & State>((set, get) => ({
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
  },
  usage: undefined,
  usageByDir: {}
}));

void useClaudeUsage.getState().init();

/**
 * Keeps the active account's usage fresh while the footer is mounted and the
 * window is visible. A hidden background window polling the filesystem buys
 * nothing, so the timer idles until the window is shown again.
 */
export const useClaudeUsagePolling = () => {
  const refresh = useClaudeUsage((s) => s.refresh);
  const activeDir = useClaudeUsage((s) => s.activeDir);

  useEffect(() => {
    if (!activeDir) return;

    let timer: null | number = null;

    const tick = () => {
      void refresh();
    };

    const start = () => {
      if (!timer) timer = window.setInterval(tick, CLAUDE_POLL_MS);
    };

    const stop = () => {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
        return;
      }

      tick();
      start();
    };

    tick();
    start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activeDir, refresh]);
};
