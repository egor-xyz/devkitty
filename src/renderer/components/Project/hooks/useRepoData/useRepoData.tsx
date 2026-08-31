import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { refresh as refreshPoller, subscribe } from 'renderer/services/poller';
import { addHidden, hiddenPullsKey, hiddenRunsKey, parseHidden } from 'renderer/utils/hidden';
import { type IgnoredWorkflow, isWorkflowHidden, parseIgnored, type RunContext } from 'renderer/utils/ignoredWorkflows';
import { refreshEvent } from 'renderer/utils/refresh';
import { unhideEvent } from 'renderer/utils/unhide';
import { type Pull, type Run } from 'types/gitHub';
import { type Project } from 'types/project';

import {
  groupPullsByBranch,
  groupRunsByBranch,
  isPullRun,
  mergeRuns,
  notifiableBranches,
  orphanPulls,
  orphanRuns,
  type PullWithTags,
  shouldNotifyRun,
  tagPulls
} from './groupByBranch';

// A pinned workflow costs one API call each, so it refreshes once a minute
// rather than on every poll.
const pinnedInterval = 60000;

// Below this, the pre-poller-migration code refused to start the repeating
// runs poll at all — kept so an absurdly low setting still can't hammer the
// API every tick.
const minRunsPollInterval = 2000;

const getHidden = (key: string): Set<number> =>
  new Set(parseHidden(sessionStorage.getItem(key)).map((entry) => entry.id));

// Hiding stores a label alongside the id so Settings can list what was hidden
// and put a single item back.
const hide = (key: string, id: number, label: string) => {
  const entries = addHidden(parseHidden(sessionStorage.getItem(key)), { id, label });
  sessionStorage.setItem(key, JSON.stringify(entries));
};

/**
 * Fetches the runs and pull requests of a whole repo once and groups them by
 * branch, so every checkout card can render its own slice.
 *
 * `pollRuns` gates the *repeating* runs poll: the caller passes `true` only
 * while at least one of the repo's checkout cards is expanded. Runs are still
 * fetched once on mount so a failing run can auto-expand its card.
 *
 * `worktreeBranches` scopes desktop notifications: the fetch covers the whole
 * repo, but only checkouts on this machine — and pull requests you opened —
 * are worth interrupting you for.
 *
 * Polling itself (the shared timer, pause-while-hidden/offline,
 * refetch-on-visible/focus/online, in-flight dedupe, backoff) is delegated to
 * the shared poller coordinator (`renderer/services/poller`). This hook only
 * owns what the coordinator can't know about: the exact fetch args, how the
 * fetched data is merged into state, and desktop-notification arming.
 */
export const useRepoData = (
  project: Project,
  pollRuns: boolean,
  worktreeBranches: string[],
  mainBranch = '',
  query = ''
) => {
  const [runs, setRuns] = useState<Run[]>([]);
  const [searchedRuns, setSearchedRuns] = useState<Run[]>([]);
  const [pinnedRuns, setPinnedRuns] = useState<Run[]>([]);
  // History fetched on demand by "load older runs". Kept apart from the polled
  // runs so the 24h prune never touches it.
  const [olderRuns, setOlderRuns] = useState<Run[]>([]);
  // Which branch's history is being fetched, and which branches have run out of
  // it: paging is per branch, so one card loading never freezes the others.
  const [loadingHistory, setLoadingHistory] = useState<string>();
  const [exhaustedHistory, setExhaustedHistory] = useState<Set<string>>(new Set());
  const historyPages = useRef<Map<string, number>>(new Map());
  const [runsLoaded, setRunsLoaded] = useState(false);
  const [pulls, setPulls] = useState<PullWithTags[]>([]);
  const [hiddenPulls, setHiddenPulls] = useState(() => getHidden(hiddenPullsKey(project.id)));

  const {
    fetchInterval,
    gitHubActions: { ignoreDependabot, ignoredWorkflows = [], notifications = true },
    gitHubPulls,
    gitHubToken
  } = useAppSettings();

  const prevConclusions = useRef<Map<number, null | string>>(new Map());
  const notifyArmed = useRef(false);
  const notifyBranches = useRef<Set<string>>(new Set());
  const hiddenWorkflows = useRef<IgnoredWorkflow[]>([]);
  // The pieces `getRuns` needs to place a run in root vs worktree, kept in a ref
  // so a branch-list change never rebuilds the poll.
  const rootContext = useRef<{ mainBranch: string; worktrees: Set<string> }>({ mainBranch: '', worktrees: new Set() });

  // The runs/pulls/pinned-runs poller subscriptions are set up once per
  // project (see the `subscribe` calls below) and must not be torn down and
  // rebuilt every time a setting or `pollRuns` changes — so their `fetch`/
  // `interval` closures read the *latest* values off these refs instead of
  // closing over props/state directly.
  const pollRunsRef = useRef(pollRuns);
  pollRunsRef.current = pollRuns;
  const fetchIntervalRef = useRef(fetchInterval);
  fetchIntervalRef.current = fetchInterval;
  const pullsIntervalRef = useRef(gitHubPulls.pollInterval);
  pullsIntervalRef.current = gitHubPulls.pollInterval;
  const ignoreDependabotRef = useRef(ignoreDependabot);
  ignoreDependabotRef.current = ignoreDependabot;
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;
  const projectNameRef = useRef(project.name);
  projectNameRef.current = project.name;

  // One-shot overrides consumed by the very next runs fetch. `nextRunsFetchDeep`
  // starts `true` so the first fetch of this hook's life walks back through
  // history pages, same as the old `first = !initialRunsFetched.current`.
  // Both refs are also set by a manual refresh (see `refresh` below and the
  // `refreshEvent` listener) to reproduce the exact arm/deep args those call
  // sites used to pass straight to `getRuns`.
  const nextRunsFetchDeep = useRef(true);
  const nextRunsFetchArmOverride = useRef<boolean | null>(null);

  // Stored data may still be the legacy `string[]`, so it is parsed forward on
  // every read rather than trusted to match the current shape.
  const ignored = useMemo(() => parseIgnored(ignoredWorkflows), [ignoredWorkflows]);

  // A run's card decides its scope: the main branch and any branch checked out
  // nowhere render under the main (root) card; a worktree's own branch is the
  // one worktree context. `isPr` comes straight off the run's event.
  const contextOf = useCallback(
    (run: Run): RunContext => ({
      isPr: isPullRun(run.event),
      isRoot: !(worktreeBranches.includes(run.head_branch) && run.head_branch !== mainBranch),
      path: run.path
    }),
    [mainBranch, worktreeBranches]
  );

  // Refs, not deps: the runs poll reads them when it fires, and rebuilding it
  // would restart the poll every time a setting changes.
  useEffect(() => {
    hiddenWorkflows.current = ignored;
  }, [ignored]);

  // A ref, not state: the runs poll reads it at fire time and must not be
  // rebuilt (and so restart the poll) every time a branch list changes identity.
  useEffect(() => {
    notifyBranches.current = notifiableBranches(worktreeBranches, pulls);
  }, [pulls, worktreeBranches]);

  useEffect(() => {
    rootContext.current = { mainBranch, worktrees: new Set(worktreeBranches) };
  }, [mainBranch, worktreeBranches]);

  /**
   * Processes one `getRuns` response: merges it into state and fires desktop
   * notifications. `arm` is true only for a fetch that belongs to a
   * "continuous polling session" (expanded + visible); the mount fetch primes
   * `prevConclusions` with `null` for anything still in flight, and notifying
   * off that map would fire a burst of hours-old results the moment a card is
   * first expanded — so notifications stay disarmed until an armed fetch has
   * primed the map itself.
   */
  const processRuns = useCallback((res: { runs?: Run[]; success: boolean }, arm: boolean) => {
    setRunsLoaded(true);
    if (!res.success) return;

    const nextRuns: Run[] = ignoreDependabotRef.current
      ? (res.runs ?? []).filter((run: Run) => !run.actor?.login?.toLowerCase().includes('dependabot'))
      : (res.runs ?? []);

    for (const run of nextRuns) {
      const prev = prevConclusions.current.get(run.id);
      if (prev === undefined && prevConclusions.current.size > 0 && run.conclusion) {
        // New run that already has a conclusion — skip notification
      } else if (
        notifyArmed.current &&
        prev !== undefined &&
        !prev &&
        shouldNotifyRun(
          run,
          isWorkflowHidden(hiddenWorkflows.current, {
            isPr: isPullRun(run.event),
            isRoot: !(rootContext.current.worktrees.has(run.head_branch) && run.head_branch !== rootContext.current.mainBranch),
            path: run.path
          })
        ) &&
        notificationsRef.current &&
        notifyBranches.current.has(run.head_branch ?? '')
      ) {
        const status = run.conclusion === 'success' ? 'passed' : 'failed';
        const event = run.event !== 'workflow_dispatch' ? run.event : 'manual';
        window.bridge.notification.show(
          `${projectNameRef.current}: ${run.name} ${status}`,
          `${event} » ${run.head_branch} (#${run.run_number})\n${run.display_title}`
        );
      }
      prevConclusions.current.set(run.id, run.conclusion ?? null);
    }

    if (arm) notifyArmed.current = true;

    // Merge rather than replace, so a run does not vanish the moment a busy
    // repo pushes it off the first page.
    setRuns((prev) => mergeRuns(prev, nextRuns, Date.now()));
  }, []);

  /**
   * Walks the repo's run history a page at a time, with no date window — the
   * poll's 24h cutoff is about staying cheap, not about how far back you may
   * look. Each call appends another 100 runs until GitHub returns a short page.
   */
  const loadOlderRuns = useCallback(
    async (branch: string) => {
      if (!gitHubToken || loadingHistory || exhaustedHistory.has(branch)) return;

      setLoadingHistory(branch);

      // One page, one API call: a page scoped to this branch is 100 of its own
      // runs, so it always brings history worth showing.
      const page = (historyPages.current.get(branch) ?? 0) + 1;
      const res = await window.bridge.gitAPI.getRunsPage(project.id, page, branch);

      setLoadingHistory(undefined);
      if (!res.success) return;

      historyPages.current.set(branch, page);
      if (res.last) setExhaustedHistory((prev) => new Set(prev).add(branch));

      const fetched = (res.runs ?? []) as Run[];
      if (fetched.length === 0) return;

      setOlderRuns((prev) => {
        const byId = new Map(prev.map((run) => [run.id, run]));
        for (const run of fetched) byId.set(run.id, run);

        return [...byId.values()];
      });
    },
    [exhaustedHistory, gitHubToken, loadingHistory, project.id]
  );

  // Subscribes once per project to the shared poller: it owns the single
  // timer, pausing while hidden/offline, and refetching stale data on
  // visible/focus/online. `fetch`/`interval` read their inputs off refs (see
  // above) so a setting or `pollRuns` change never resubscribes — that would
  // both restart the coordinator's cache entry for this key needlessly and
  // (via the cache-hit replay on subscribe) risk re-running notification
  // arming against already-processed data.
  useEffect(() => {
    if (!gitHubToken) return;

    const fetchRuns = async () => {
      const deep = nextRunsFetchDeep.current;
      nextRunsFetchDeep.current = false;

      const armOverride = nextRunsFetchArmOverride.current;
      nextRunsFetchArmOverride.current = null;
      const arm = armOverride ?? pollRunsRef.current;

      const res = await window.bridge.gitAPI.getRuns(project.id, deep);
      return { arm, res };
    };

    const unsubscribe = subscribe(
      {
        fetch: fetchRuns,
        interval: () => (pollRunsRef.current && fetchIntervalRef.current > minRunsPollInterval ? fetchIntervalRef.current : Infinity),
        key: `runs:${project.id}`
      },
      ({ arm, res }) => processRuns(res, arm)
    );

    return unsubscribe;
  }, [gitHubToken, processRuns, project.id]);

  // `notifyArmed` means "prevConclusions was primed by a fetch inside the
  // current continuous polling session". Collapsing a card stops the runs
  // poll (via the `interval` above returning `Infinity`) without unsubscribing
  // it, so disarming has to happen here explicitly rather than by tearing the
  // subscription down.
  useEffect(() => {
    if (!pollRuns) {
      notifyArmed.current = false;
      return;
    }

    // Expanding a card (or mounting already expanded) shouldn't wait for the
    // next scheduled tick — nudge the coordinator to fetch now.
    refreshPoller(`runs:${project.id}`);
    refreshPoller(`pinnedRuns:${project.id}`);
  }, [pollRuns, project.id]);

  // Same disarm the old `visibilitychange` handler did while hidden. Fetching
  // itself is already paused by the coordinator while the tab is hidden; this
  // only keeps `notifyArmed` from staying (or resuming) true across a gap
  // nobody was watching, so the catch-up fetch on return never fires a burst
  // of stale notifications.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) notifyArmed.current = false;
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const fetchPulls = useCallback(async () => {
    const [openRes, authorRes, reviewRes] = await Promise.all([
      window.bridge.gitAPI.getOpenPulls(project.id),
      window.bridge.gitAPI.getPulls(project.id, 'author'),
      window.bridge.gitAPI.getPulls(project.id, 'review-requested')
    ]);

    return { authorRes, openRes, reviewRes };
  }, [project.id]);

  const handlePullsData = useCallback(
    ({
      authorRes,
      openRes,
      reviewRes
    }: {
      authorRes: { pulls?: { number: number }[]; success: boolean };
      openRes: { pulls?: Pull[]; success: boolean };
      reviewRes: { pulls?: { number: number }[]; success: boolean };
    }) => {
      if (!openRes.success || !authorRes.success || !reviewRes.success) return;

      const numbersOf = (res: { pulls?: { number: number }[] }) => (res.pulls ?? []).map((item) => item.number);

      setPulls(tagPulls(openRes.pulls ?? [], numbersOf(authorRes), numbersOf(reviewRes)));
    },
    []
  );

  useEffect(() => {
    if (!gitHubToken) return;

    const unsubscribe = subscribe(
      {
        fetch: fetchPulls,
        interval: () => pullsIntervalRef.current,
        key: `pulls:${project.id}`
      },
      handlePullsData
    );

    return unsubscribe;
  }, [fetchPulls, gitHubToken, handlePullsData, project.id]);

  const hidePull = useCallback(
    (pullId: number, label = `#${pullId}`) => {
      hide(hiddenPullsKey(project.id), pullId, label);
      setHiddenPulls((prev) => new Set(prev).add(pullId));
    },
    [project.id]
  );

  // Runs used to be hidden one at a time; hiding is per workflow now, so any
  // leftover per-run entries are dropped rather than filtering forever.
  useEffect(() => {
    sessionStorage.removeItem(hiddenRunsKey(project.id));
  }, [project.id]);

  // Settings can clear the hidden pulls for every repo at once; the set lives
  // in state, so it has to be told to re-read storage.
  useEffect(() => {
    const onUnhide = () => setHiddenPulls(getHidden(hiddenPullsKey(project.id)));

    window.addEventListener(unhideEvent, onUnhide);

    return () => window.removeEventListener(unhideEvent, onUnhide);
  }, [project.id]);

  const clearHiddenPulls = useCallback(() => {
    sessionStorage.removeItem(hiddenPullsKey(project.id));
    setHiddenPulls(new Set());
  }, [project.id]);

  /**
   * Pinned workflows are fetched by workflow rather than by page, so a deploy
   * that last ran days ago still shows. One call per pinned workflow, so this
   * runs on its own slow clock rather than with the poll.
   */
  const fetchPinnedRuns = useCallback(() => window.bridge.gitAPI.getPinnedRuns(project.id), [project.id]);

  const handlePinnedRunsData = useCallback((res: { runs?: Run[]; success: boolean }) => {
    if (res.success) setPinnedRuns(res.runs ?? []);
  }, []);

  useEffect(() => {
    if (!gitHubToken) return;

    const unsubscribe = subscribe(
      {
        fetch: fetchPinnedRuns,
        interval: () => (pollRunsRef.current ? pinnedInterval : Infinity),
        key: `pinnedRuns:${project.id}`
      },
      handlePinnedRunsData
    );

    return unsubscribe;
  }, [fetchPinnedRuns, gitHubToken, handlePinnedRunsData, project.id]);

  // Bridges both worlds during the poller migration: `requestRefresh` (the
  // navbar's "refresh everything" action) still dispatches this legacy DOM
  // event for any not-yet-migrated listener, alongside the shared coordinator
  // refresh it now also triggers. This hook is migrated, so it no longer
  // fetches off the event itself — the coordinator's own `refresh()` call
  // (already wired into `requestRefresh`) does that — but it still needs the
  // *deep*, force-armed fetch the old `getRuns(true, true)` call made, so it
  // primes the same one-shot refs a manual `refresh()` below uses.
  useEffect(() => {
    const onRefresh = () => {
      nextRunsFetchDeep.current = true;
      nextRunsFetchArmOverride.current = true;
    };

    window.addEventListener(refreshEvent, onRefresh);

    return () => window.removeEventListener(refreshEvent, onRefresh);
  }, []);

  /**
   * Typing a workflow name asks GitHub for that workflow's runs directly, which
   * reaches past the 24h window the poll is limited to. Debounced, because it
   * costs two API calls and fires on every keystroke otherwise.
   */
  useEffect(() => {
    const term = query.trim();
    if (!gitHubToken || term.length < 2) {
      setSearchedRuns([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      const res = await window.bridge.gitAPI.searchRuns(project.id, term);
      if (res.success) setSearchedRuns(res.runs ?? []);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [gitHubToken, project.id, query]);

  // No per-branch cap: the card folds finished checks away and pages them.
  // Searched runs join the polled ones and skip the 24h prune — they were asked
  // for by name, so their age is beside the point.
  const allRuns = useMemo(() => {
    const byId = new Map(runs.map((run) => [run.id, run]));
    for (const run of [...pinnedRuns, ...searchedRuns, ...olderRuns]) if (!byId.has(run.id)) byId.set(run.id, run);

    return [...byId.values()];
  }, [olderRuns, pinnedRuns, runs, searchedRuns]);

  // Hiding a workflow has to apply here too, not only to the next fetch: runs
  // already merged into state would otherwise keep showing forever. A run's
  // scope depends on where it renders, so it is judged by its own context.
  const runsByBranch = useMemo(
    () => groupRunsByBranch(allRuns.filter((run) => !isWorkflowHidden(ignored, contextOf(run)))),
    [allRuns, contextOf, ignored]
  );

  // The same runs, but only the hidden ones: a card can offer a peek at what it
  // is holding back without anything being unhidden.
  const hiddenRunsByBranch = useMemo(() => {
    if (ignored.length === 0) return {};

    return groupRunsByBranch(allRuns.filter((run) => isWorkflowHidden(ignored, contextOf(run))));
  }, [allRuns, contextOf, ignored]);

  const pullsByBranch = useMemo(
    () => groupPullsByBranch(pulls.filter(({ pull }) => !hiddenPulls.has(pull.id))),
    [hiddenPulls, pulls]
  );

  const getOrphanRuns = useCallback(
    (branches: string[]) => orphanRuns(runsByBranch, branches),
    [runsByBranch]
  );

  const getOrphanPulls = useCallback(
    (branches: string[]) => orphanPulls(pullsByBranch, branches),
    [pullsByBranch]
  );

  // Matches the pre-migration `refresh()`: a deep runs fetch that does *not*
  // force-arm notifications (unlike the global `refreshEvent`, which does),
  // plus a plain re-fetch of pulls and pinned runs.
  const refresh = useCallback(() => {
    nextRunsFetchDeep.current = true;
    nextRunsFetchArmOverride.current = false;
    refreshPoller(`runs:${project.id}`);
    refreshPoller(`pulls:${project.id}`);
    refreshPoller(`pinnedRuns:${project.id}`);
  }, [project.id]);

  return {
    clearHiddenPulls,
    exhaustedHistory,
    getOrphanPulls,
    getOrphanRuns,
    hiddenPullCount: hiddenPulls.size,
    hiddenRunsByBranch,
    hidePull,
    loadingHistory,
    loadOlderRuns,
    pullsByBranch,
    refresh,
    runsByBranch,
    runsLoaded
  };
};
