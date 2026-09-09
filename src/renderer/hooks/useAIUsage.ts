import { refresh as refreshPoller, subscribe, type Unsubscribe } from 'renderer/services/poller';
import { type AIAccount, type AIDetection, type AIProvider, type AIUsage } from 'types/aiUsage';
import { type AppSettings } from 'types/appSettings';
import { type ClaudeAccount } from 'types/claudeUsage';
import { create } from 'zustand';

import { useAppSettings } from './useAppSettings';

export const AI_POLL_MS = 60000;
export const aiAccountKey = (account: Pick<AIAccount, 'dir' | 'provider'>) => `${account.provider}:${account.dir}`;
export const AI_PROVIDERS: AIProvider[] = ['claude', 'codex'];

type Actions = {
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  setActive: (provider: AIProvider, dir: string) => void;
  setProvider: (provider: AIProvider) => void;
};
type State = {
  accounts: AIAccount[];
  activeDirs: Partial<Record<AIProvider, string>>;
  activeProvider: AIProvider;
  detection: Record<AIProvider, AIDetection>;
  discoveryErrors: Partial<Record<AIProvider, string>>;
  errorByAccount: Record<string, string | undefined>;
  loadingByAccount: Record<string, boolean>;
  ready: boolean;
  usageByAccount: Record<string, AIUsage>;
};

const subscriptions = new Map<string, Unsubscribe>();
const inFlight = new Map<string, Promise<AIUsage>>();
const lastReads = new Map<string, number>();
let initGeneration = 0;
const message = (error: unknown) => error instanceof Error ? error.message : 'Could not read usage';
const selectedAccounts = (state: State) => state.accounts.filter((account) =>
  state.activeProvider === account.provider && state.activeDirs[account.provider] === account.dir
);
const selectedProviderAccounts = (state: State) => state.accounts.filter((account) =>
  state.activeDirs[account.provider] === account.dir
);

export const useAIUsage = create<Actions & State>((set, get) => {
  const read = (account: AIAccount, force = false): Promise<AIUsage> => {
    const key = aiAccountKey(account);
    const pending = inFlight.get(key);
    if (pending) return pending;
    const cached = get().usageByAccount[key];
    // Joining a newly selected poll subscription must not repeat its initial read.
    if (!force && cached && Date.now() - (lastReads.get(key) ?? 0) < 1000) return Promise.resolve(cached);
    set((state) => ({ loadingByAccount: { ...state.loadingByAccount, [key]: !cached } }));
    const request = Promise.resolve().then(async () => {
      if (account.provider === 'codex') return window.bridge.codex.usage(account);
      const usage = await window.bridge.claude.usage(account);
      return { ...usage, account };
    }).then((usage) => {
      lastReads.set(key, Date.now());
      set((state) => ({
        errorByAccount: { ...state.errorByAccount, [key]: undefined },
        usageByAccount: { ...state.usageByAccount, [key]: usage }
      }));
      return usage;
    }).catch((error: unknown) => {
      set((state) => ({ errorByAccount: { ...state.errorByAccount, [key]: message(error) } }));
      throw error;
    }).finally(() => {
      inFlight.delete(key);
      set((state) => ({ loadingByAccount: { ...state.loadingByAccount, [key]: false } }));
    });
    inFlight.set(key, request);
    return request;
  };
  const syncSubscriptions = () => {
    const accounts = selectedAccounts(get());
    const keys = new Set(accounts.map(aiAccountKey));
    for (const [key, unsubscribe] of subscriptions) {
      if (!keys.has(key)) {
        unsubscribe();
        subscriptions.delete(key);
      }
    }
    for (const account of accounts) {
      const key = aiAccountKey(account);
      if (subscriptions.has(key)) continue;
      subscriptions.set(key, subscribe<AIUsage>({
        fetch: () => read(account), interval: () => AI_POLL_MS, key: `aiUsage:${key}`
      }, () => {}));
      // The coordinator parks unsubscribed cached keys at Infinity. Re-arm a
      // returning account even when subscribe delivers cached data immediately.
      refreshPoller(`aiUsage:${key}`);
    }
  };
  return {
    accounts: [],
    activeDirs: {},
    activeProvider: 'claude',
    detection: { claude: { installed: false }, codex: { installed: false } },
    discoveryErrors: {},
    errorByAccount: {},
    init: async () => {
      const generation = ++initGeneration;
      const results = await Promise.all(AI_PROVIDERS.map(async (provider) => {
        const bridge = window.bridge[provider];
        const [detection, accounts] = await Promise.allSettled([
          Promise.resolve().then(() => bridge.detect()),
          Promise.resolve().then(() => bridge.accounts())
        ]);
        return { accounts, detection, provider };
      }));
      const settings: AppSettings | undefined = await window.bridge.settings.get('appSettings').catch((): undefined => undefined);
      if (generation !== initGeneration) return;
      const state = get();
      const accounts: AIAccount[] = [];
      const detection = { ...state.detection };
      const discoveryErrors: State['discoveryErrors'] = {};
      const activeDirs: State['activeDirs'] = {};
      for (const result of results) {
        const { provider } = result;
        if (result.detection.status === 'fulfilled') detection[provider] = result.detection.value;
        const providerAccounts: AIAccount[] = result.accounts.status === 'fulfilled'
          ? result.accounts.value.map((account: ClaudeAccount) => ({ ...account, provider }))
          : state.accounts.filter((account) => account.provider === provider);
        accounts.push(...providerAccounts);
        if (result.accounts.status === 'rejected') discoveryErrors[provider] = message(result.accounts.reason);
        else if (result.detection.status === 'rejected') discoveryErrors[provider] = message(result.detection.reason);
        const preferred = state.ready ? state.activeDirs[provider] : settings?.[provider === 'claude' ? 'claudeAccountDir' : 'codexAccountDir'];
        activeDirs[provider] = providerAccounts.find((account) => account.dir === preferred)?.dir ?? providerAccounts[0]?.dir;
      }
      const preferredProvider = state.ready ? state.activeProvider : settings?.aiProvider;
      const providersWithAccounts = AI_PROVIDERS.filter((provider) => accounts.some((account) => account.provider === provider));
      const availableProviders = providersWithAccounts.length > 0
        ? providersWithAccounts : AI_PROVIDERS.filter((provider) => detection[provider].installed);
      const activeProvider: AIProvider = preferredProvider !== 'both' && preferredProvider && availableProviders.includes(preferredProvider)
        ? preferredProvider : availableProviders[0] ?? 'claude';
      set({ accounts, activeDirs, activeProvider, detection, discoveryErrors, ready: true });
      await Promise.allSettled(selectedProviderAccounts(get()).map((account) => read(account, true)));
      syncSubscriptions();
    },
    loadingByAccount: {},
    ready: false,
    refresh: async () => {
      await Promise.allSettled(selectedAccounts(get()).map((account) => read(account, true)));
    },
    setActive: (provider, dir) => {
      const state = get();
      if (state.activeDirs[provider] === dir || !state.accounts.some((account) => account.provider === provider && account.dir === dir)) return;
      set({ activeDirs: { ...state.activeDirs, [provider]: dir } });
      useAppSettings.getState().set(provider === 'claude' ? { claudeAccountDir: dir } : { codexAccountDir: dir });
      void get().refresh();
      syncSubscriptions();
    },
    setProvider: (provider) => {
      if (!AI_PROVIDERS.includes(provider) || provider === get().activeProvider) return;
      set({ activeProvider: provider });
      useAppSettings.getState().set({ aiProvider: provider });
      void get().refresh();
      syncSubscriptions();
    },
    usageByAccount: {}
  };
});

void useAIUsage.getState().init();

export const __resetAIUsagePollingForTests = () => {
  for (const unsubscribe of subscriptions.values()) unsubscribe();
  subscriptions.clear();
  inFlight.clear();
  lastReads.clear();
  initGeneration++;
};
