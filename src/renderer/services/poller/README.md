# Poller

A shared polling coordinator: one scheduler for the whole renderer instead of
every component/hook running its own `setInterval`. It dedupes concurrent
fetches, staggers refetches so they don't all fire at once, backs off on
errors, and pauses while the window is hidden or offline.

`coordinator.ts` is plain TypeScript (no React, safe to unit test in Node).
`usePoll.ts` is a thin React hook wrapper over it. Import from `index.ts`.

## API

```ts
type Priority = 'active' | 'background';

type PollSpec<T> = {
  key: string; // stable identity, e.g. `prChecks:${projectId}:${prNumber}`
  fetch: () => Promise<T>;
  interval: (data: T | undefined) => number; // ms until next poll; Infinity = stop auto-polling
  priority?: Priority; // default 'active', reserved for future budget tiers
};

type Unsubscribe = () => void;

function subscribe<T>(spec: PollSpec<T>, onData: (data: T) => void, onError?: (e: unknown) => void): Unsubscribe;
function refresh(prefix?: string): void; // re-poll subscribed keys now (undefined/'' = all)
function mutate<T>(key: string, action: () => Promise<T>): Promise<T>; // run action, then hot re-poll the key
function getSnapshot<T>(key: string): T | undefined; // last cached data for a key, no side effects

function usePoll<T>(spec: PollSpec<T>): { data: T | undefined; error: unknown; loading: boolean };
```

## Usage example

```tsx
const { data, error, loading } = usePoll({
  key: `prChecks:${projectId}:${prNumber}`,
  fetch: () => window.bridge.gitAPI.getPRChecks({ projectId, prNumber }),
  interval: (data) => (data?.mergeableState === 'unknown' ? 4_000 : 60_000)
});
```

`usePoll` subscribes once per `key`. Passing new `fetch`/`interval` closures
on a re-render does **not** resubscribe — only a changed `key` does. That
means it's safe to define `fetch`/`interval` inline on every render.

## Key naming convention

`<kind>:<projectId>[:<id>]`, e.g. `prChecks:42:1337`, `runs:42`,
`branchStatus:42:main`. Use the same key across every subscriber of the same
underlying data so they share one cache entry and one fetch — and so
`refresh('prChecks:')` / `mutate('prChecks:42:1337', ...)` target exactly the
keys you mean.

## The adaptive interval idea

`interval(data)` is called with the *last* fetched value (or `undefined`
before the first fetch) and returns how long to wait before polling again.
Return a small number while something is in flux and a large one once it has
settled — e.g. a PR whose checks are still running polls every few seconds,
but once every check is green (or the PR is merged) it can poll once a
minute, or return `Infinity` to stop polling entirely until something calls
`refresh()` or `mutate()` on that key again. This "heat" pattern is what
keeps the app responsive without hammering the GitHub API.

## Other behaviors worth knowing before migrating a component

- Multiple subscribers on the same `key` share one entry: a second subscriber
  gets the cached value instantly, and never causes a duplicate fetch.
- Fetches for the same key are deduped — a `subscribe`/`refresh` while a
  fetch is already in flight just waits for it, it never starts a second one.
- Unsubscribing (e.g. on unmount) stops polling that key but keeps the last
  cached value around for the next subscriber.
- Polling pauses automatically while the tab is hidden or the browser is
  offline, and catches up (re-polls anything stale) when it becomes visible,
  regains focus, or comes back online.
- `mutate(key, action)` is for user-initiated writes (merge a PR, rerun a
  job, ...): it runs `action()`, then does a short burst of extra polls (now,
  +800ms, +1500ms) so the UI catches up to the effect of the mutation quickly.
- `__reset()` (exported from `coordinator.ts`, not `index.ts`) clears
  everything and stops the loop — for test isolation only.
