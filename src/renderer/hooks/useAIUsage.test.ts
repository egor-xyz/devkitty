import type * as PollCoordinator from 'renderer/services/poller/coordinator';

import { type PollSpec } from 'renderer/services/poller';
import { type AIAccount, type AIUsage } from 'types/aiUsage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const provider = () => ({ accounts: vi.fn().mockResolvedValue([]), detect: vi.fn().mockResolvedValue({ installed: false }), usage: vi.fn() });
  const claude = provider();
  const codex = provider();
  const cursor = provider();
  const settings = vi.fn().mockResolvedValue({});
  const save = vi.fn();
  const unsubscribe = vi.fn();
  const subscribe = vi.fn<(spec: PollSpec<AIUsage>, onData: (data: AIUsage) => void) => () => void>(() => unsubscribe);
  const refresh = vi.fn<(key?: string) => void>();
  Object.assign(window.bridge, { claude, codex, cursor, settings: { ...window.bridge.settings, get: settings } });
  return { claude, codex, cursor, refresh, save, settings, subscribe, unsubscribe };
});
vi.mock('./useAppSettings', () => ({ useAppSettings: { getState: () => ({ set: mocks.save }) } }));
vi.mock('renderer/services/poller', () => ({ refresh: mocks.refresh, subscribe: mocks.subscribe }));

import { __resetAIUsagePollingForTests, aiAccountKey, useAIUsage } from './useAIUsage';

const claude: AIAccount = { dir: '/profiles/shared', label: 'Claude', provider: 'claude' };
const claude2: AIAccount = { ...claude, dir: '/profiles/claude-2' };
const codex: AIAccount = { dir: '/profiles/shared', label: 'Codex', provider: 'codex' };
const codex2: AIAccount = { ...codex, dir: '/profiles/codex-2' };
const cursor: AIAccount = { dir: '/profiles/cursor', label: 'Cursor', provider: 'cursor', surfaces: ['ide'] };
const usage = (account: AIAccount): AIUsage => ({
  account, computedAt: 1000, metrics: [{ id: 'seven-day', label: '7D', percent: 0.2, resetsAt: 2000, scope: 'account', source: 'provider', title: '7D', tokens: 20 }]
});
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, reject, resolve };
};

describe('AI usage provider and account isolation', () => {
  beforeEach(() => {
    __resetAIUsagePollingForTests();
    vi.clearAllMocks();
    mocks.subscribe.mockImplementation(() => mocks.unsubscribe);
    mocks.refresh.mockImplementation(() => {});
    useAIUsage.setState({
      accounts: [], activeDirs: {}, activeProvider: 'claude',
      detection: { claude: { installed: false }, codex: { installed: false }, cursor: { installed: false } },
      discoveryErrors: {}, errorByAccount: {}, loadingByAccount: {}, ready: false, usageByAccount: {}
    });
    mocks.settings.mockResolvedValue({});
    mocks.claude.accounts.mockResolvedValue([claude, claude2]);
    mocks.codex.accounts.mockResolvedValue([codex, codex2]);
    mocks.cursor.accounts.mockResolvedValue([]);
    for (const provider of [mocks.claude, mocks.codex, mocks.cursor]) {
      provider.detect.mockResolvedValue({ installed: true });
      provider.usage.mockImplementation(async (account: AIAccount) => usage(account));
    }
  });

  it('preloads both providers but polls only the active selected account', async () => {
    await useAIUsage.getState().init();
    const state = useAIUsage.getState();
    expect(state.activeProvider).toBe('claude');
    expect(state.usageByAccount[aiAccountKey(claude)].account.provider).toBe('claude');
    expect(state.usageByAccount[aiAccountKey(codex)].account.provider).toBe('codex');
    expect(mocks.subscribe).toHaveBeenCalledTimes(1);
    const specs = mocks.subscribe.mock.calls as unknown as [{ fetch: () => Promise<AIUsage>; key: string }][];
    expect(specs.map(([spec]) => spec.key)).toEqual(['aiUsage:claude:/profiles/shared']);
    await Promise.all(specs.map(([spec]) => spec.fetch()));
    expect(mocks.claude.usage).toHaveBeenCalledTimes(1);
    expect(mocks.codex.usage).toHaveBeenCalledTimes(1);
  });

  it('migrates legacy both preference to the first available concrete provider', async () => {
    mocks.settings.mockResolvedValue({ aiProvider: 'both' });
    await useAIUsage.getState().init();
    expect(useAIUsage.getState().activeProvider).toBe('claude');
    expect(mocks.claude.usage).toHaveBeenCalledWith(claude);
    expect(mocks.codex.usage).toHaveBeenCalledWith(codex);
  });

  it('restores provider and separate legacy Claude / Codex preferences', async () => {
    mocks.settings.mockResolvedValue({ aiProvider: 'codex', claudeAccountDir: claude2.dir, codexAccountDir: codex2.dir });
    await useAIUsage.getState().init();
    expect(useAIUsage.getState().activeDirs).toEqual({ claude: claude2.dir, codex: codex2.dir, cursor: undefined });
    expect(mocks.claude.usage).toHaveBeenCalledWith(claude2);
    expect(mocks.codex.usage).toHaveBeenCalledWith(codex2);
    useAIUsage.getState().setProvider('claude');
    await useAIUsage.getState().refresh();
    expect(mocks.claude.usage).toHaveBeenCalledWith(claude2);
    expect(mocks.save).toHaveBeenCalledWith({ aiProvider: 'claude' });
  });

  it('adds Cursor once and merges CLI and app-only Grok detection into its surfaces', async () => {
    mocks.cursor.accounts.mockResolvedValue([cursor]);
    mocks.cursor.detect.mockResolvedValue({ installed: true, surfaces: ['cli', 'grok-bot'] });
    await useAIUsage.getState().init();
    const cursorAccounts = useAIUsage.getState().accounts.filter(({ provider }) => provider === 'cursor');
    expect(cursorAccounts).toHaveLength(1);
    expect(cursorAccounts[0].surfaces).toEqual(['ide', 'cli', 'grok-bot']);
    expect(mocks.cursor.usage).toHaveBeenCalledExactlyOnceWith(cursorAccounts[0]);
    useAIUsage.getState().setProvider('cursor');
    expect(mocks.save).toHaveBeenCalledWith({ aiProvider: 'cursor' });
  });

  it('remembers independent account choices across provider switches', async () => {
    await useAIUsage.getState().init();
    useAIUsage.getState().setActive('claude', claude2.dir);
    await useAIUsage.getState().refresh();
    useAIUsage.getState().setProvider('codex');
    await useAIUsage.getState().refresh();
    useAIUsage.getState().setActive('codex', codex2.dir);
    await useAIUsage.getState().refresh();
    useAIUsage.getState().setProvider('claude');
    await useAIUsage.getState().refresh();
    expect(useAIUsage.getState().activeDirs).toEqual({ claude: claude2.dir, codex: codex2.dir, cursor: undefined });
    expect(mocks.save).toHaveBeenCalledWith({ claudeAccountDir: claude2.dir });
    expect(mocks.save).toHaveBeenCalledWith({ codexAccountDir: codex2.dir });
  });

  it('keeps Codex usable after Claude discovery fails and recovers on rescan', async () => {
    mocks.claude.accounts.mockRejectedValue(new Error('Claude unavailable'));
    await useAIUsage.getState().init();
    expect(useAIUsage.getState().ready).toBe(true);
    expect(useAIUsage.getState().accounts).toEqual([codex, codex2]);
    expect(useAIUsage.getState().discoveryErrors.claude).toBe('Claude unavailable');
    expect(useAIUsage.getState().usageByAccount[aiAccountKey(codex)]).toBeDefined();
    mocks.claude.accounts.mockResolvedValue([claude]);
    await useAIUsage.getState().init();
    expect(useAIUsage.getState().discoveryErrors.claude).toBeUndefined();
    expect(useAIUsage.getState().activeDirs.claude).toBe(claude.dir);
  });

  it('supports Codex-only accounts without a CLI and falls back from unavailable preferred provider', async () => {
    mocks.settings.mockResolvedValue({ aiProvider: 'claude' });
    mocks.claude.accounts.mockResolvedValue([]);
    mocks.codex.detect.mockResolvedValue({ installed: false });
    await useAIUsage.getState().init();
    expect(useAIUsage.getState().activeProvider).toBe('codex');
    expect(useAIUsage.getState().usageByAccount[aiAccountKey(codex)]).toBeDefined();
  });

  it('ignores invalid account selections', async () => {
    await useAIUsage.getState().init();
    mocks.save.mockClear();
    useAIUsage.getState().setActive('claude', codex2.dir);
    expect(useAIUsage.getState().activeDirs.claude).toBe(claude.dir);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('isolates late success and error after switching accounts', async () => {
    await useAIUsage.getState().init();
    const stale = deferred<AIUsage>();
    mocks.claude.usage.mockImplementation((account: AIAccount) => account.dir === claude.dir ? stale.promise : Promise.resolve(usage(account)));
    const refresh = useAIUsage.getState().refresh();
    useAIUsage.getState().setActive('claude', claude2.dir);
    await vi.waitFor(() => expect(useAIUsage.getState().usageByAccount[aiAccountKey(claude2)]).toBeDefined());
    stale.reject(new Error('Old account failed'));
    await refresh;
    expect(useAIUsage.getState().errorByAccount[aiAccountKey(claude)]).toBe('Old account failed');
    expect(useAIUsage.getState().errorByAccount[aiAccountKey(claude2)]).toBeUndefined();
    expect(useAIUsage.getState().loadingByAccount[aiAccountKey(claude2)]).toBe(false);
    expect(useAIUsage.getState().activeDirs.claude).toBe(claude2.dir);
  });

  it('clears first-read loading on errors, then retries successfully', async () => {
    mocks.codex.usage.mockRejectedValue(new Error('Read failed'));
    await useAIUsage.getState().init();
    expect(useAIUsage.getState().loadingByAccount[aiAccountKey(codex)]).toBe(false);
    expect(useAIUsage.getState().errorByAccount[aiAccountKey(codex)]).toBe('Read failed');
    mocks.codex.usage.mockResolvedValue(usage(codex));
    useAIUsage.getState().setProvider('codex');
    await useAIUsage.getState().refresh();
    expect(useAIUsage.getState().errorByAccount[aiAccountKey(codex)]).toBeUndefined();
    expect(useAIUsage.getState().usageByAccount[aiAccountKey(codex)]).toBeDefined();
  });

  it('retains cached usage when background fetch fails', async () => {
    await useAIUsage.getState().init();
    mocks.codex.usage.mockRejectedValue(new Error('Transient'));
    useAIUsage.getState().setProvider('codex');
    await useAIUsage.getState().refresh();
    expect(useAIUsage.getState().usageByAccount[aiAccountKey(codex)]).toEqual(usage(codex));
    expect(useAIUsage.getState().errorByAccount[aiAccountKey(codex)]).toBe('Transient');
  });
  it.each(['provider', 'account'])('keeps polling after %s round trip with the real coordinator', async (kind) => {
    const coordinator = await vi.importActual<typeof PollCoordinator>('renderer/services/poller/coordinator');
    vi.useFakeTimers();
    coordinator.__reset();
    mocks.subscribe.mockImplementation(coordinator.subscribe);
    mocks.refresh.mockImplementation(coordinator.refresh);
    try {
      await useAIUsage.getState().init();
      await vi.advanceTimersByTimeAsync(500);
      if (kind === 'provider') useAIUsage.getState().setProvider('codex');
      else useAIUsage.getState().setActive('claude', claude2.dir);
      await useAIUsage.getState().refresh();
      await vi.advanceTimersByTimeAsync(500);
      if (kind === 'provider') useAIUsage.getState().setProvider('claude');
      else useAIUsage.getState().setActive('claude', claude.dir);
      await useAIUsage.getState().refresh();
      await vi.advanceTimersByTimeAsync(500);
      mocks.claude.usage.mockClear();
      await vi.advanceTimersByTimeAsync(60000);
      expect(mocks.claude.usage).toHaveBeenCalledExactlyOnceWith(claude);
    } finally {
      __resetAIUsagePollingForTests();
      coordinator.__reset();
      vi.useRealTimers();
    }
  });

});
