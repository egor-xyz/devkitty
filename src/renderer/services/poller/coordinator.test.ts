import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __reset, getSnapshot, mutate, refresh, subscribe } from './coordinator';

type FakeTarget = {
  addEventListener: (type: string, cb: () => void) => void;
  dispatchEvent: (type: string) => void;
  removeEventListener: (type: string, cb: () => void) => void;
};

function createFakeTarget(): FakeTarget {
  const listeners = new Map<string, Set<() => void>>();
  return {
    addEventListener(type, cb) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(cb);
    },
    dispatchEvent(type) {
      for (const cb of listeners.get(type) ?? []) cb();
    },
    removeEventListener(type, cb) {
      listeners.get(type)?.delete(cb);
    }
  };
}

let win: FakeTarget;
let doc: FakeTarget & { hidden: boolean };
let nav: { onLine: boolean };

beforeEach(() => {
  vi.useFakeTimers();
  win = createFakeTarget();
  doc = Object.assign(createFakeTarget(), { hidden: false });
  nav = { onLine: true };
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', doc);
  vi.stubGlobal('navigator', nav);
  __reset();
});

afterEach(() => {
  __reset();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('subscribe', () => {
  it('performs an initial fetch, delivers data via onData, and schedules the next poll', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ n: 1 });
    const intervalFn = vi.fn().mockReturnValue(2000);
    const onData = vi.fn();

    subscribe({ fetch: fetchFn, interval: intervalFn, key: 'k1' }, onData);

    expect(fetchFn).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalledWith({ n: 1 });

    // Not due again until ~2000ms after the fetch resolved (t=500 -> t=2500).
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('delivers cached data to a second subscriber instantly, without an extra fetch', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ n: 1 });
    const intervalFn = vi.fn().mockReturnValue(60_000);
    const onData1 = vi.fn();
    const onData2 = vi.fn();

    subscribe({ fetch: fetchFn, interval: intervalFn, key: 'k2' }, onData1);
    await vi.advanceTimersByTimeAsync(500);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    subscribe({ fetch: fetchFn, interval: intervalFn, key: 'k2' }, onData2);
    expect(onData2).toHaveBeenCalledWith({ n: 1 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('dedupes concurrent subscribers so only one fetch is in-flight for a key', async () => {
    let resolveFetch: (v: { n: number }) => void = () => {};
    const fetchFn = vi.fn(
      () =>
        new Promise<{ n: number }>((resolve) => {
          resolveFetch = resolve;
        })
    );
    const intervalFn = vi.fn().mockReturnValue(5000);
    const onData1 = vi.fn();
    const onData2 = vi.fn();

    subscribe({ fetch: fetchFn, interval: intervalFn, key: 'k3' }, onData1);
    await vi.advanceTimersByTimeAsync(500);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // A second subscriber arrives while the first fetch is still pending.
    subscribe({ fetch: fetchFn, interval: intervalFn, key: 'k3' }, onData2);
    await vi.advanceTimersByTimeAsync(500);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    resolveFetch({ n: 42 });
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(onData1).toHaveBeenCalledWith({ n: 42 });
    expect(onData2).toHaveBeenCalledWith({ n: 42 });
  });

  it('drives refetch timing off the adaptive interval returned by spec.interval', async () => {
    type Data = { state: 'done' | 'pending' };
    const sequence: Data[] = [{ state: 'pending' }, { state: 'done' }];
    let call = 0;
    const fetchFn = vi.fn(() => Promise.resolve(sequence[Math.min(call++, sequence.length - 1)]));
    const intervalFn = vi.fn((d?: Data) => (d?.state === 'pending' ? 1000 : 60_000));
    const onData = vi.fn();

    subscribe({ fetch: fetchFn, interval: intervalFn, key: 'k4' }, onData);

    await vi.advanceTimersByTimeAsync(500); // fetch #1 -> pending, next due at t=1500
    expect(fetchFn).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000); // t=1500 -> fetch #2 -> done, next due far away
    expect(fetchFn).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('grows the retry backoff on repeated fetch failures', async () => {
    const err = new Error('boom');
    const fetchFn = vi.fn().mockRejectedValue(err);
    const intervalFn = vi.fn().mockReturnValue(10_000);
    const onData = vi.fn();
    const onError = vi.fn();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5); // neutralizes +/-20% jitter

    subscribe({ fetch: fetchFn, interval: intervalFn, key: 'k5' }, onData, onError);

    await vi.advanceTimersByTimeAsync(500); // failure #1 at t=500
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(err);

    // base = DEFAULT_BACKOFF_BASE_MS (5000, no successful interval yet), failures=1 -> 10000ms
    await vi.advanceTimersByTimeAsync(9999);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchFn).toHaveBeenCalledTimes(2); // failure #2 at t=10500

    // failures=2 -> min(5000*4, 300000) = 20000ms
    await vi.advanceTimersByTimeAsync(19_999);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchFn).toHaveBeenCalledTimes(3);

    randomSpy.mockRestore();
  });

  it('keeps the cache but stops polling after the last subscriber unsubscribes', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ n: 7 });
    const intervalFn = vi.fn().mockReturnValue(1000);
    const onData = vi.fn();

    const unsubscribe = subscribe({ fetch: fetchFn, interval: intervalFn, key: 'k9' }, onData);
    await vi.advanceTimersByTimeAsync(500);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(getSnapshot('k9')).toEqual({ n: 7 });

    unsubscribe();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(getSnapshot('k9')).toEqual({ n: 7 });
  });
});

describe('refresh', () => {
  it('re-polls only subscribed keys matching the given prefix', async () => {
    const fetchA = vi.fn().mockResolvedValue({ v: 'a' });
    const fetchB = vi.fn().mockResolvedValue({ v: 'b' });
    const bigInterval = vi.fn().mockReturnValue(60_000);

    subscribe({ fetch: fetchA, interval: bigInterval, key: 'prChecks:1' }, vi.fn());
    subscribe({ fetch: fetchB, interval: bigInterval, key: 'other:1' }, vi.fn());

    await vi.advanceTimersByTimeAsync(500);
    expect(fetchA).toHaveBeenCalledTimes(1);
    expect(fetchB).toHaveBeenCalledTimes(1);

    refresh('prChecks:');
    await vi.advanceTimersByTimeAsync(500);

    expect(fetchA).toHaveBeenCalledTimes(2);
    expect(fetchB).toHaveBeenCalledTimes(1);
  });

  it('with no prefix re-polls every subscribed key', async () => {
    const fetchA = vi.fn().mockResolvedValue({ v: 'a' });
    const fetchB = vi.fn().mockResolvedValue({ v: 'b' });
    const bigInterval = vi.fn().mockReturnValue(60_000);

    subscribe({ fetch: fetchA, interval: bigInterval, key: 'x:1' }, vi.fn());
    subscribe({ fetch: fetchB, interval: bigInterval, key: 'y:1' }, vi.fn());
    await vi.advanceTimersByTimeAsync(500);

    refresh();
    await vi.advanceTimersByTimeAsync(500);

    expect(fetchA).toHaveBeenCalledTimes(2);
    expect(fetchB).toHaveBeenCalledTimes(2);
  });
});

describe('hidden/offline gating', () => {
  it('skips starting new fetches while the document is hidden, then re-polls stale data once visible', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ n: 1 });
    const intervalFn = vi.fn().mockReturnValue(1000);

    subscribe({ fetch: fetchFn, interval: intervalFn, key: 'k7' }, vi.fn());
    await vi.advanceTimersByTimeAsync(500); // fetch #1 at t=500, next due ~t=1500
    expect(fetchFn).toHaveBeenCalledTimes(1);

    doc.hidden = true;
    await vi.advanceTimersByTimeAsync(3000); // would have been due, but tick skips while hidden
    expect(fetchFn).toHaveBeenCalledTimes(1);

    doc.hidden = false;
    doc.dispatchEvent('visibilitychange'); // marks stale subscribed entries due
    await vi.advanceTimersByTimeAsync(500);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('skips starting new fetches while offline, then re-polls stale data once back online', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ n: 1 });
    const intervalFn = vi.fn().mockReturnValue(1000);

    subscribe({ fetch: fetchFn, interval: intervalFn, key: 'k7b' }, vi.fn());
    await vi.advanceTimersByTimeAsync(500);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    nav.onLine = false;
    await vi.advanceTimersByTimeAsync(3000);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    nav.onLine = true;
    win.dispatchEvent('online');
    await vi.advanceTimersByTimeAsync(500);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

describe('mutate', () => {
  it('runs the action, then hot re-polls the key at 0ms, 800ms and 1500ms', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ n: 1 });
    const intervalFn = vi.fn().mockReturnValue(60_000);
    const action = vi.fn().mockResolvedValue('done');

    subscribe({ fetch: fetchFn, interval: intervalFn, key: 'k8' }, vi.fn());
    await vi.advanceTimersByTimeAsync(500);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const result = await mutate('k8', action);

    expect(result).toBe('done');
    expect(action).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(2); // immediate hot re-poll

    await vi.advanceTimersByTimeAsync(800);
    expect(fetchFn).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(700); // total 1500ms since mutate resolved
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });

  it('returns the action result without touching the poller when the key has no entry', async () => {
    const action = vi.fn().mockResolvedValue('ok');

    const result = await mutate('unregistered-key', action);

    expect(result).toBe('ok');
    expect(action).toHaveBeenCalledTimes(1);
  });
});

describe('getSnapshot', () => {
  it('returns undefined until the first fetch resolves', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ n: 3 });
    const intervalFn = vi.fn().mockReturnValue(5000);

    expect(getSnapshot('k11')).toBeUndefined();
    subscribe({ fetch: fetchFn, interval: intervalFn, key: 'k11' }, vi.fn());
    expect(getSnapshot('k11')).toBeUndefined();

    await vi.advanceTimersByTimeAsync(500);
    expect(getSnapshot('k11')).toEqual({ n: 3 });
  });
});

describe('__reset', () => {
  it('clears the registry so a subsequent subscribe starts with a clean cache', async () => {
    const fetchFn1 = vi.fn().mockResolvedValue({ n: 1 });
    const intervalFn = vi.fn().mockReturnValue(1000);

    subscribe({ fetch: fetchFn1, interval: intervalFn, key: 'k10' }, vi.fn());
    await vi.advanceTimersByTimeAsync(500);
    expect(getSnapshot('k10')).toEqual({ n: 1 });

    __reset();
    expect(getSnapshot('k10')).toBeUndefined();

    const fetchFn2 = vi.fn().mockResolvedValue({ n: 2 });
    subscribe({ fetch: fetchFn2, interval: intervalFn, key: 'k10' }, vi.fn());
    await vi.advanceTimersByTimeAsync(500);

    expect(fetchFn2).toHaveBeenCalledTimes(1);
    expect(getSnapshot('k10')).toEqual({ n: 2 });
  });
});
