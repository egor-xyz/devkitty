import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { addHidden, hiddenPullsKey, hiddenRunsKey, parseHidden } from 'renderer/utils/hidden';
import { unhideEvent } from 'renderer/utils/unhide';
import { type Run } from 'types/gitHub';
import { type Project } from 'types/project';

import {
  groupPullsByBranch,
  groupRunsByBranch,
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
 */
export const useRepoData = (project: Project, pollRuns: boolean, worktreeBranches: string[], query = '') => {
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

  const runsIntervalId = useRef<null | number>(null);
  const pullsIntervalId = useRef<null | number>(null);
  const prevConclusions = useRef<Map<number, null | string>>(new Map());
  const initialRunsFetched = useRef(false);
  const notifyArmed = useRef(false);
  const notifyBranches = useRef<Set<string>>(new Set());
  const hiddenWorkflows = useRef<Set<string>>(new Set());

  // Refs, not deps: `getRuns` reads them when it fires, and rebuilding it would
  // restart the poll every time a setting changes.
  useEffect(() => {
    hiddenWorkflows.current = new Set(ignoredWorkflows);
  }, [ignoredWorkflows]);

  // A ref, not state: `getRuns` reads it at fire time and must not be rebuilt
  // (and so restart the poll) every time a branch list changes identity.
  useEffect(() => {
    notifyBranches.current = notifiableBranches(worktreeBranches, pulls);
  }, [pulls, worktreeBranches]);

  /**
   * `arm` is passed only by the *polling* fetch. The mount fetch runs for every
   * repo, collapsed ones included, so it primes `prevConclusions` with `null`
   * for anything still in flight. Notifying off that map would fire a burst of
   * hours-old results the moment a card is first expanded — so notifications
   * stay disarmed until a polling fetch has primed the map itself.
   */
  const getRuns = useCallback(async (arm = false, deep = false) => {
    if (!gitHubToken) return;

    const res = await window.bridge.gitAPI.getRuns(project.id, deep);
    setRunsLoaded(true);
    if (!res.success) return;

    const nextRuns: Run[] = ignoreDependabot
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
        shouldNotifyRun(run, hiddenWorkflows.current) &&
        notifications &&
        notifyBranches.current.has(run.head_branch ?? '')
      ) {
        const status = run.conclusion === 'success' ? 'passed' : 'failed';
        const event = run.event !== 'workflow_dispatch' ? run.event : 'manual';
        window.bridge.notification.show(
          `${project.name}: ${run.name} ${status}`,
          `${event} » ${run.head_branch} (#${run.run_number})\n${run.display_title}`
        );
      }
      prevConclusions.current.set(run.id, run.conclusion ?? null);
    }

    if (arm) notifyArmed.current = true;

    // Merge rather than replace, so a run does not vanish the moment a busy
    // repo pushes it off the first page.
    setRuns((prev) => mergeRuns(prev, nextRuns, Date.now()));
  }, [gitHubToken, ignoreDependabot, notifications, project.id, project.name]);

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

  const getPulls = useCallback(async () => {
    if (!gitHubToken) return;

    const [openRes, authorRes, reviewRes] = await Promise.all([
      window.bridge.gitAPI.getOpenPulls(project.id),
      window.bridge.gitAPI.getPulls(project.id, 'author'),
      window.bridge.gitAPI.getPulls(project.id, 'review-requested')
    ]);

    if (!openRes.success || !authorRes.success || !reviewRes.success) return;

    const numbersOf = (res: { pulls?: { number: number }[] }) => (res.pulls ?? []).map((item) => item.number);

    setPulls(tagPulls(openRes.pulls ?? [], numbersOf(authorRes), numbersOf(reviewRes)));
  }, [gitHubToken, project.id]);

  useEffect(() => {
    if (!gitHubToken) return;

    // One fetch per mount even while details are hidden, so the repo has
    // something to show the moment they are switched on.
    // The first fetch walks back through pages so a quiet branch has its runs
    // from the start; the polls that follow only need the newest page.
    if (!initialRunsFetched.current || pollRuns) {
      const first = !initialRunsFetched.current;
      initialRunsFetched.current = true;
      getRuns(pollRuns, first);
    }

    // `notifyArmed` means "prevConclusions was primed by a fetch inside the
    // current continuous polling session". Whenever polling stops the map goes
    // stale, so disarm — otherwise resuming fires a burst of notifications for
    // runs that concluded while nobody was watching.
    if (!pollRuns) {
      notifyArmed.current = false;
      return;
    }

    const startPolling = () => {
      if (!runsIntervalId.current && fetchInterval > 2000) {
        runsIntervalId.current = window.setInterval(() => getRuns(), fetchInterval);
      }
    };

    const stopPolling = () => {
      if (runsIntervalId.current) {
        window.clearInterval(runsIntervalId.current);
        runsIntervalId.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
        notifyArmed.current = false;
      } else {
        getRuns(true);
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchInterval, getRuns, gitHubToken, pollRuns]);

  useEffect(() => {
    if (!gitHubToken) return;

    getPulls();

    const start = () => {
      // Guarding on the ref alone left the old timer running at the old
      // interval whenever the setting changed.
      if (!pullsIntervalId.current) {
        pullsIntervalId.current = window.setInterval(getPulls, gitHubPulls.pollInterval);
      }
    };

    const stop = () => {
      if (pullsIntervalId.current) {
        window.clearInterval(pullsIntervalId.current);
        pullsIntervalId.current = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
        return;
      }

      getPulls();
      start();
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [getPulls, gitHubPulls.pollInterval, gitHubToken]);

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
  const getPinnedRuns = useCallback(async () => {
    if (!gitHubToken) return;

    const res = await window.bridge.gitAPI.getPinnedRuns(project.id);
    if (res.success) setPinnedRuns(res.runs ?? []);
  }, [gitHubToken, project.id]);

  useEffect(() => {
    getPinnedRuns();

    if (!pollRuns) return;

    let timer: null | number = null;

    const start = () => {
      if (!timer) timer = window.setInterval(getPinnedRuns, pinnedInterval);
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

      getPinnedRuns();
      start();
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [getPinnedRuns, pollRuns]);

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
  // already merged into state would otherwise keep showing forever.
  const runsByBranch = useMemo(() => {
    const hiddenWorkflows = new Set(ignoredWorkflows);

    return groupRunsByBranch(allRuns.filter((run) => !hiddenWorkflows.has(run.path)));
  }, [allRuns, ignoredWorkflows]);

  // The same runs, but only the hidden ones: a card can offer a peek at what it
  // is holding back without anything being unhidden.
  const hiddenRunsByBranch = useMemo(() => {
    const hiddenWorkflows = new Set(ignoredWorkflows);
    if (hiddenWorkflows.size === 0) return {};

    return groupRunsByBranch(allRuns.filter((run) => hiddenWorkflows.has(run.path)));
  }, [allRuns, ignoredWorkflows]);

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

  const refresh = useCallback(() => {
    getRuns(false, true);
    getPulls();
    getPinnedRuns();
  }, [getPinnedRuns, getPulls, getRuns]);

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
