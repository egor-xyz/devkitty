import { refresh as refreshPoller, subscribe, type Unsubscribe } from 'renderer/services/poller';
import { type AIAccount, type AIDetection, type AIProvider, type AIUsage } from 'types/aiUsage';
import { type AppSettings } from 'types/appSettings';
import { create } from 'zustand';

import { useAppSettings } from './useAppSettings';

export const AI_POLL_MS = 60000;
export const aiAccountKey = (account: Pick<AIAccount, 'dir' | 'provider'>) => `${account.provider}:${account.dir}`;

type ProviderBridge = {
  accounts: () => Promise<AIAccount[]>;
  detect: () => Promise<AIDetection>;
  usage: (account: AIAccount) => Promise<AIUsage>;
};
type ProviderConfig = {
  name: string;
  settingsKey: 'claudeAccountDir' | 'codexAccountDir' | 'cursorAccountDir';
};

export const AI_PROVIDER_CONFIG = {
  claude: { name: 'Claude', settingsKey: 'claudeAccountDir' },
  codex: { name: 'Codex', settingsKey: 'codexAccountDir' },
  cursor: { name: 'Cursor', settingsKey: 'cursorAccountDir' }
} satisfies Record<AIProvider, ProviderConfig>;
export const AI_PROVIDERS = Object.keys(AI_PROVIDER_CONFIG) as AIProvider[];

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
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Could not read usage';
const bridgeFor = (provider: AIProvider): ProviderBridge => window.bridge[provider];
const pollKey = (account: AIAccount) => `aiUsage:${aiAccountKey(account)}`;
const currentAccount = (state: State) => state.accounts.filter((account) => (
  state.activeProvider === account.provider && state.activeDirs[account.provider] === account.dir
));
const activeAccounts = (state: State) => state.accounts.filter((account) => state.activeDirs[account.provider] === account.dir);

export const useAIUsage = create<Actions & State>((set, get) => {
  const read = (account: AIAccount, force = false): Promise<AIUsage> => {
    const key = aiAccountKey(account);
    const pending = inFlight.get(key);
    if (pending) return pending;
    const cached = get().usageByAccount[key];
    if (!force && cached && Date.now() - (lastReads.get(key) ?? 0) < 1000) return Promise.resolve(cached);
    set((state) => ({ loadingByAccount: { ...state.loadingByAccount, [key]: !cached } }));
    const request = Promise.resolve().then(() => bridgeFor(account.provider).usage(account)).then((usage) => {
      lastReads.set(key, Date.now());
      set((state) => ({ errorByAccount: { ...state.errorByAccount, [key]: undefined }, usageByAccount: { ...state.usageByAccount, [key]: usage } }));
      return usage;
    }).catch((error: unknown) => {
      set((state) => ({ errorByAccount: { ...state.errorByAccount, [key]: errorMessage(error) } }));
      throw error;
    }).finally(() => {
      inFlight.delete(key);
      set((state) => ({ loadingByAccount: { ...state.loadingByAccount, [key]: false } }));
    });
    inFlight.set(key, request);
    return request;
  };

  const syncSubscriptions = () => {
    const accounts = currentAccount(get());
    const keys = new Set(accounts.map(aiAccountKey));
    for (const [key, unsubscribe] of subscriptions) {
      if (!keys.has(key)) { unsubscribe(); subscriptions.delete(key); }
    }
    for (const account of accounts) {
      const key = aiAccountKey(account);
      if (subscriptions.has(key)) continue;
      subscriptions.set(key, subscribe<AIUsage>({ fetch: () => read(account), interval: () => AI_POLL_MS, key: pollKey(account) }, () => {}));
      refreshPoller(pollKey(account));
    }
  };

  return {
    accounts: [],
    activeDirs: {},
    activeProvider: 'claude',
    detection: { claude: { installed: false }, codex: { installed: false }, cursor: { installed: false } },
    discoveryErrors: {},
    errorByAccount: {},
    init: async () => {
      const generation = ++initGeneration;
      const results = await Promise.all(AI_PROVIDERS.map(async (provider) => {
        const bridge = bridgeFor(provider);
        const [detection, accounts] = await Promise.allSettled([bridge.detect(), bridge.accounts()]);
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
        const detectedSurfaces = provider === 'cursor' && result.detection.status === 'fulfilled' ? result.detection.value.surfaces ?? [] : [];
        const providerAccounts = result.accounts.status === 'fulfilled'
          ? result.accounts.value.map((account) => {
            const surfaces = provider === 'cursor' ? [...new Set([...(account.surfaces ?? []), ...detectedSurfaces])] : account.surfaces;
            return { ...account, ...(surfaces?.length ? { surfaces } : {}), provider };
          })
          : state.accounts.filter((account) => account.provider === provider);
        accounts.push(...providerAccounts);
        if (result.accounts.status === 'rejected') discoveryErrors[provider] = errorMessage(result.accounts.reason);
        else if (result.detection.status === 'rejected') discoveryErrors[provider] = errorMessage(result.detection.reason);
        const preferred = state.ready ? state.activeDirs[provider] : settings?.[AI_PROVIDER_CONFIG[provider].settingsKey];
        activeDirs[provider] = providerAccounts.find((account) => account.dir === preferred)?.dir ?? providerAccounts[0]?.dir;
      }
      const preferredProvider = state.ready ? state.activeProvider : settings?.aiProvider;
      const withAccounts = AI_PROVIDERS.filter((provider) => accounts.some((account) => account.provider === provider));
      const available = withAccounts.length > 0 ? withAccounts : AI_PROVIDERS.filter((provider) => detection[provider].installed);
      const activeProvider = preferredProvider && preferredProvider !== 'both' && available.includes(preferredProvider) ? preferredProvider : available[0] ?? 'claude';
      set({ accounts, activeDirs, activeProvider, detection, discoveryErrors, ready: true });
      await Promise.allSettled(activeAccounts(get()).map((account) => read(account, true)));
      syncSubscriptions();
    },
    loadingByAccount: {},
    ready: false,
    refresh: async () => {
      await Promise.allSettled(currentAccount(get()).map((account) => read(account, true)));
    },
    setActive: (provider, dir) => {
      const state = get();
      if (state.activeDirs[provider] === dir || !state.accounts.some((account) => account.provider === provider && account.dir === dir)) return;
      set({ activeDirs: { ...state.activeDirs, [provider]: dir } });
      useAppSettings.getState().set({ [AI_PROVIDER_CONFIG[provider].settingsKey]: dir });
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
