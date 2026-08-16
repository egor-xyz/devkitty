import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { type Run } from 'types/gitHub';
import { type Project } from 'types/project';

import {
  groupPullsByBranch,
  groupRunsByBranch,
  orphanPulls,
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

export const useRepoData = (project: Project) => {
  const [runs, setRuns] = useState<Run[]>([]);
  const [pulls, setPulls] = useState<PullWithTags[]>([]);
  const [hiddenRuns, setHiddenRuns] = useState(() => getHidden(hiddenRunsKey(project.id)));
  const [hiddenPulls, setHiddenPulls] = useState(() => getHidden(hiddenPullsKey(project.id)));

  const {
    fetchInterval,
    gitHubActions: { count, ignoreDependabot, notifications = true },
    gitHubPulls,
    gitHubToken
  } = useAppSettings();

  const runsIntervalId = useRef<null | number>(null);
  const pullsIntervalId = useRef<null | number>(null);
  const prevConclusions = useRef<Map<number, null | string>>(new Map());

  const getRuns = useCallback(async () => {
    if (!gitHubToken) return;

    const res = await window.bridge.gitAPI.getRuns(project.id);
    if (!res.success) {
      setRuns([]);
      return;
    }

    const nextRuns: Run[] = ignoreDependabot
      ? (res.runs ?? []).filter((run: Run) => !run.actor?.login?.toLowerCase().includes('dependabot'))
      : (res.runs ?? []);

    for (const run of nextRuns) {
      const prev = prevConclusions.current.get(run.id);
      if (prev === undefined && prevConclusions.current.size > 0 && run.conclusion) {
        // New run that already has a conclusion — skip notification
      } else if (prev !== undefined && !prev && run.conclusion && notifications) {
        const status = run.conclusion === 'success' ? 'passed' : 'failed';
        const event = run.event !== 'workflow_dispatch' ? run.event : 'manual';
        window.bridge.notification.show(
          `${project.name}: ${run.name} ${status}`,
          `${event} » ${run.head_branch} (#${run.run_number})\n${run.display_title}`
        );
      }
      prevConclusions.current.set(run.id, run.conclusion ?? null);
    }

    setRuns(nextRuns);
  }, [gitHubToken, ignoreDependabot, notifications, project.id, project.name]);

  const getPulls = useCallback(async () => {
    if (!gitHubToken) return;

    const [openRes, authorRes, reviewRes] = await Promise.all([
      window.bridge.gitAPI.getOpenPulls(project.id),
      window.bridge.gitAPI.getPulls(project.id, 'author'),
      window.bridge.gitAPI.getPulls(project.id, 'review-requested')
    ]);

    if (!openRes.success) {
      setPulls([]);
      return;
    }

    const numbersOf = (res: { pulls?: { number: number }[]; success: boolean }) =>
      res.success ? (res.pulls ?? []).map((item) => item.number) : [];

    setPulls(tagPulls(openRes.pulls ?? [], numbersOf(authorRes), numbersOf(reviewRes)));
  }, [gitHubToken, project.id]);

  useEffect(() => {
    if (!gitHubToken) return;

    getRuns();

    const startPolling = () => {
      if (!runsIntervalId.current && fetchInterval > 2000) {
        runsIntervalId.current = window.setInterval(getRuns, fetchInterval);
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
      } else {
        getRuns();
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchInterval, getRuns, gitHubToken]);

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
    () => groupRunsByBranch(runs.filter((run) => !hiddenRuns.has(run.id)), count),
    [count, hiddenRuns, runs]
  );

  const pullsByBranch = useMemo(
    () => groupPullsByBranch(pulls.filter(({ pull }) => !hiddenPulls.has(pull.id))),
    [hiddenPulls, pulls]
  );

  const getOrphanPulls = useCallback(
    (branches: string[]) => orphanPulls(pullsByBranch, branches),
    [pullsByBranch]
  );

  const refresh = useCallback(() => {
    getRuns();
    getPulls();
  }, [getPulls, getRuns]);

  return {
    clearHiddenPulls,
    clearHiddenRuns,
    getOrphanPulls,
    hiddenPullCount: hiddenPulls.size,
    hiddenRunCount: hiddenRuns.size,
    hidePull,
    hideRun,
    pullsByBranch,
    refresh,
    runsByBranch
  };
};
