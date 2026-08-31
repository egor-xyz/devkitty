/**
 * Shared polling coordinator.
 *
 * A single self-scheduling loop that owns every "poll this on an interval"
 * subscription in the renderer, instead of each component/hook running its
 * own `setInterval`. See ./README.md for the intended usage and migration
 * notes.
 *
 * This file is intentionally framework-agnostic (no React). The React
 * wrapper lives in ./usePoll.ts.
 */

export type PollSpec<T> = {
  /** Performs one fetch. Should wrap `window.bridge.*` (or similar) in real usage. */
  fetch: () => Promise<T>;
  /**
   * Given the latest known data (or `undefined` before the first fetch),
   * returns the number of ms to wait before the next poll. Return
   * `Infinity` to stop auto-polling until something else re-heats the key
   * (see `refresh` / `mutate`).
   */
  interval: (data: T | undefined) => number;
  /** Stable identity for the poll, e.g. `prChecks:${projectId}:${prNumber}`. */
  key: string;
  /** Reserved for future budget tiers. Defaults to `'active'`. */
  priority?: Priority;
};

export type Priority = 'active' | 'background';

export type Unsubscribe = () => void;

type Entry = {
  failures: number;
  inFlight?: Promise<unknown>;
  lastData?: unknown;
  lastFetched: number;
  /** Last finite (clamped) interval this key resolved to; used as the backoff base. */
  lastFiniteInterval?: number;
  nextDue: number;
  spec: PollSpec<unknown>;
  subscribers: Set<Subscriber<unknown>>;
};

type Subscriber<T> = {
  onData: (data: T) => void;
  onError?: (e: unknown) => void;
};

const TICK_MS = 500;
const MAX_CONCURRENCY = 4;
const MIN_INTERVAL_MS = 1000;
const MAX_BACKOFF_MS = 300_000;
const DEFAULT_BACKOFF_BASE_MS = 5_000;
const HOT_REPOLL_DELAYS_MS = [800, 1500];

const registry = new Map<string, Entry>();

let timer: ReturnType<typeof setInterval> | undefined;
let gatesInstalled = false;
let gateHandlers:
  | undefined
  | {
      onFocus: () => void;
      onOnline: () => void;
      onVisibilityChange: () => void;
    };

/** Test-only: clears the registry and stops the loop so tests are isolated. */
export function __reset(): void {
  registry.clear();
  stopLoop();
  removeGatesIfInstalled();
}

export function getSnapshot<T>(key: string): T | undefined {
  return registry.get(key)?.lastData as T | undefined;
}

export async function mutate<T>(key: string, action: () => Promise<T>): Promise<T> {
  const result = await action();

  const entry = registry.get(key);
  if (entry) {
    entry.nextDue = now();
    scheduleHotRepoll(key);
  }

  return result;
}

export function refresh(prefix?: string): void {
  const p = prefix ?? '';
  const t = now();
  for (const entry of registry.values()) {
    if (entry.subscribers.size === 0) continue;
    if (p === '' || entry.spec.key.startsWith(p)) {
      entry.nextDue = t;
    }
  }
}

export function subscribe<T>(
  spec: PollSpec<T>,
  onData: (data: T) => void,
  onError?: (e: unknown) => void
): Unsubscribe {
  ensureLoop();

  const entry = getOrCreateEntry(spec);
  const subscriber = { onData, onError } as unknown as Subscriber<unknown>;
  entry.subscribers.add(subscriber);

  if (entry.lastData !== undefined) {
    // Cache hit: deliver instantly, no extra fetch.
    onData(entry.lastData as T);
  } else if (!entry.inFlight) {
    entry.nextDue = now();
  }

  return () => {
    entry.subscribers.delete(subscriber);
    if (entry.subscribers.size === 0) {
      // Keep the cache, stop polling until someone subscribes/refreshes again.
      entry.nextDue = Infinity;
    }
  };
}

/** Floors at 1000ms; non-finite (including `Infinity`) means "never". */
function clampInterval(ms: number): number {
  if (!Number.isFinite(ms)) return Infinity;
  return Math.max(MIN_INTERVAL_MS, ms);
}

function ensureLoop(): void {
  if (timer !== undefined) return;
  timer = setInterval(tick, TICK_MS);
  installGatesOnce();
}

function getOrCreateEntry<T>(spec: PollSpec<T>): Entry {
  const existing = registry.get(spec.key);
  if (existing) {
    // Always keep the latest spec (fresh closures) for this key.
    existing.spec = spec as unknown as PollSpec<unknown>;
    return existing;
  }

  const entry: Entry = {
    failures: 0,
    lastFetched: 0,
    nextDue: Infinity,
    spec: spec as unknown as PollSpec<unknown>,
    subscribers: new Set()
  };
  registry.set(spec.key, entry);
  return entry;
}

function hasDocument(): boolean {
  return typeof document !== 'undefined';
}

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

function installGatesOnce(): void {
  if (gatesInstalled) return;
  if (!hasWindow()) return;

  const onVisibilityChange = (): void => {
    if (!hasDocument() || !document.hidden) {
      markStaleSubscribedEntriesDue();
    }
  };
  const onOnline = (): void => markStaleSubscribedEntriesDue();
  const onFocus = (): void => markStaleSubscribedEntriesDue();

  gateHandlers = { onFocus, onOnline, onVisibilityChange };

  if (hasDocument() && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('online', onOnline);
    window.addEventListener('focus', onFocus);
  }

  gatesInstalled = true;
}

function isHiddenOrOffline(): boolean {
  const hidden = hasDocument() && Boolean(document.hidden);
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  return hidden || offline;
}

function markStaleSubscribedEntriesDue(): void {
  const t = now();
  for (const entry of registry.values()) {
    if (entry.subscribers.size === 0) continue;

    const interval = clampInterval(entry.spec.interval(entry.lastData));
    if (interval === Infinity) continue;

    const stale = t - entry.lastFetched >= interval;
    if (stale) {
      entry.nextDue = t;
    }
  }
}

function now(): number {
  return Date.now();
}

function removeGatesIfInstalled(): void {
  if (!gatesInstalled || !gateHandlers) {
    gatesInstalled = false;
    gateHandlers = undefined;
    return;
  }

  if (hasDocument() && typeof document.removeEventListener === 'function') {
    document.removeEventListener('visibilitychange', gateHandlers.onVisibilityChange);
  }
  if (hasWindow() && typeof window.removeEventListener === 'function') {
    window.removeEventListener('online', gateHandlers.onOnline);
    window.removeEventListener('focus', gateHandlers.onFocus);
  }

  gateHandlers = undefined;
  gatesInstalled = false;
}

async function runFetch(key: string, entry: Entry): Promise<void> {
  const promise = entry.spec.fetch();
  entry.inFlight = promise;
  try {
    const data = await promise;
    entry.lastData = data;
    entry.lastFetched = now();
    entry.failures = 0;

    for (const sub of entry.subscribers) {
      sub.onData(data);
    }

    const clamped = clampInterval(entry.spec.interval(data));
    if (Number.isFinite(clamped)) {
      entry.lastFiniteInterval = clamped;
    }
    entry.nextDue = clamped === Infinity ? Infinity : now() + clamped;
  } catch (e) {
    entry.failures += 1;

    for (const sub of entry.subscribers) {
      sub.onError?.(e);
    }

    const base = entry.lastFiniteInterval ?? DEFAULT_BACKOFF_BASE_MS;
    const backoffBase = Math.min(base * 2 ** entry.failures, MAX_BACKOFF_MS);
    const jitter = backoffBase * (Math.random() * 0.4 - 0.2); // +/- 20%
    entry.nextDue = now() + backoffBase + jitter;
  } finally {
    entry.inFlight = undefined;
  }
}

function scheduleHotRepoll(key: string): void {
  const attempt = (): void => {
    const entry = registry.get(key);
    if (entry && !entry.inFlight) {
      void runFetch(key, entry);
    }
  };

  attempt();
  for (const delayMs of HOT_REPOLL_DELAYS_MS) {
    setTimeout(attempt, delayMs);
  }
}

function stopLoop(): void {
  if (timer !== undefined) {
    clearInterval(timer);
    timer = undefined;
  }
}

function tick(): void {
  if (isHiddenOrOffline()) return;

  const t = now();
  const due: [string, Entry][] = [];
  for (const [key, entry] of registry) {
    if (entry.subscribers.size > 0 && !entry.inFlight && entry.nextDue <= t) {
      due.push([key, entry]);
    }
  }

  // Anti-thundering-herd stagger: only start up to MAX_CONCURRENCY fetches
  // per tick; the rest wait for the next tick.
  const slice = due.slice(0, MAX_CONCURRENCY);
  for (const [key, entry] of slice) {
    void runFetch(key, entry);
  }
}
