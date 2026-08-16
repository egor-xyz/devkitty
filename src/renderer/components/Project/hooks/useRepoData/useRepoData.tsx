import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
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
  tagPulls
} from './groupByBranch';

const hiddenRunsKey = (id: string) => `hiddenActions:${id}`;
const hiddenPullsKey = (id: string) => `hiddenPulls:${id}`;

const getHidden = (key: string): Set<number> => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
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
export const useRepoData = (project: Project, pollRuns: boolean, worktreeBranches: string[]) => {
  const [runs, setRuns] = useState<Run[]>([]);
  const [runsLoaded, setRunsLoaded] = useState(false);
  const [pulls, setPulls] = useState<PullWithTags[]>([]);
  const [hiddenRuns, setHiddenRuns] = useState(() => getHidden(hiddenRunsKey(project.id)));
  const [hiddenPulls, setHiddenPulls] = useState(() => getHidden(hiddenPullsKey(project.id)));

  const {
    fetchInterval,
    gitHubActions: { count, hideDone, ignoreDependabot, inProgress, notifications = true },
    gitHubPulls,
    gitHubToken
  } = useAppSettings();

  const runsIntervalId = useRef<null | number>(null);
  const pullsIntervalId = useRef<null | number>(null);
  const prevConclusions = useRef<Map<number, null | string>>(new Map());
  const initialRunsFetched = useRef(false);
  const notifyArmed = useRef(false);
  const notifyBranches = useRef<Set<string>>(new Set());

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
        run.conclusion &&
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

    // "In progress only" is a live view of what is running right now, so it
    // replaces rather than accumulates. Everything else merges, so a run does
    // not vanish the moment a busy repo pushes it off the first page.
    setRuns((prev) => (inProgress ? nextRuns : mergeRuns(prev, nextRuns, Date.now())));
  }, [gitHubToken, ignoreDependabot, inProgress, notifications, project.id, project.name]);

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

    if (!pullsIntervalId.current) {
      pullsIntervalId.current = window.setInterval(getPulls, gitHubPulls.pollInterval);
    }

    return () => {
      if (pullsIntervalId.current) {
        window.clearInterval(pullsIntervalId.current);
        pullsIntervalId.current = null;
      }
    };
  }, [getPulls, gitHubPulls.pollInterval, gitHubToken]);

  const hideRun = useCallback(
    (runId: number) => {
      setHiddenRuns((prev) => {
        const next = new Set(prev);
        next.add(runId);
        sessionStorage.setItem(hiddenRunsKey(project.id), JSON.stringify([...next]));
        return next;
      });
    },
    [project.id]
  );

  const hidePull = useCallback(
    (pullId: number) => {
      setHiddenPulls((prev) => {
        const next = new Set(prev);
        next.add(pullId);
        sessionStorage.setItem(hiddenPullsKey(project.id), JSON.stringify([...next]));
        return next;
      });
    },
    [project.id]
  );

  const clearHiddenRuns = useCallback(() => {
    sessionStorage.removeItem(hiddenRunsKey(project.id));
    setHiddenRuns(new Set());
  }, [project.id]);

  const clearHiddenPulls = useCallback(() => {
    sessionStorage.removeItem(hiddenPullsKey(project.id));
    setHiddenPulls(new Set());
  }, [project.id]);

  const runsByBranch = useMemo(
    () =>
      groupRunsByBranch(
        runs
          .filter((run) => !hiddenRuns.has(run.id))
          .filter(
            (run) =>
              !hideDone ||
              !run.conclusion ||
              run.status === 'in_progress' ||
              run.status === 'queued' ||
              run.status === 'pending'
          ),
        count
      ),
    [count, hiddenRuns, hideDone, runs]
  );

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
  }, [getPulls, getRuns]);

  return {
    clearHiddenPulls,
    clearHiddenRuns,
    getOrphanPulls,
    getOrphanRuns,
    hiddenPullCount: hiddenPulls.size,
    hiddenRunCount: hiddenRuns.size,
    hidePull,
    hideRun,
    pullsByBranch,
    refresh,
    runsByBranch,
    runsLoaded
  };
};
