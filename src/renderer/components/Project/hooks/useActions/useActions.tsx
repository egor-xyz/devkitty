import { Classes, Tag } from '@blueprintjs/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { appToaster } from 'renderer/utils/appToaster';
import { type Run } from 'types/gitHub';
import { type GitStatus, type Project } from 'types/project';

import { Workflow } from '../../components/Workflow';

const hiddenKey = (id: string) => `hiddenActions:${id}`;

const getHiddenRuns = (projectId: string): Set<number> => {
  try {
    const raw = sessionStorage.getItem(hiddenKey(projectId));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

export const useActions = (gitStatus: GitStatus, project: Project) => {
  const [runs, setRuns] = useState([]);
  const [hiddenRuns, setHiddenRuns] = useState(() => getHiddenRuns(project.id));
  const [showActions, setShowActions] = useState(() => {
    const saved = localStorage.getItem(`showActions:${project.id}`);
    return saved ? JSON.parse(saved) : false;
  });
  const [isEmpty, setIsEmpty] = useState(false);
  const {
    fetchInterval,
    gitHubActions: { all, ignoreDependabot, inProgress },
    gitHubToken
  } = useAppSettings();

  const intervalId = useRef<null | number>(null);

  const getActions = useCallback(async () => {
    if (!gitStatus?.branchSummary?.current) return;

    const savedOrigin = localStorage.getItem(`GitResetModal:origin-${project.id}`);
    const filterBy = [gitStatus.branchSummary.current];
    if (savedOrigin) filterBy.push(savedOrigin);

    const res = await window.bridge.gitAPI.getAction(project.id, filterBy);

    if (!res.success) {
      setIsEmpty(true);
      return;
    }

    setIsEmpty(false);
    const nextRuns = res.runs ?? [];
    const filteredRuns = ignoreDependabot
      ? nextRuns.filter((run: Run) => {
          const login = run.actor?.login?.toLowerCase();
          return !login?.includes('dependabot');
        })
      : nextRuns;
    setRuns(filteredRuns);
  }, [gitStatus, project.id, ignoreDependabot]);

  const hideRun = useCallback((runId: number) => {
    setHiddenRuns((prev) => {
      const next = new Set(prev);
      next.add(runId);
      sessionStorage.setItem(hiddenKey(project.id), JSON.stringify([...next]));
      return next;
    });
  }, [project.id]);

  const toggleActions = async () => {
    if (!showActions && !gitHubToken) {
      (await appToaster).show({
        intent: 'warning',
        message: 'Set GitHub token in settings to see actions'
      });
      return;
    }
    setShowActions((prev: boolean) => {
      const newValue = !prev;
      localStorage.setItem(`showActions:${project.id}`, JSON.stringify(newValue));
      return newValue;
    });
  };

  useEffect(() => {
    if (!showActions || !gitStatus?.branchSummary.current || !project.id) return;
    getActions();

    const startPolling = () => {
      if (!intervalId.current && fetchInterval > 2000) {
        intervalId.current = window.setInterval(() => {
          getActions();
        }, fetchInterval);
      }
    };

    const stopPolling = () => {
      if (intervalId.current) {
        window.clearInterval(intervalId.current);
        intervalId.current = undefined;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        getActions();
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchInterval, getActions, gitStatus, project, showActions]);

  const Actions = useMemo(
    () =>
      showActions && (
        <>
          {isEmpty && runs.length < 1 && (
            <div className={`flex justify-between items-center py-2.5 px-4 ${Classes.TEXT_MUTED}`}>
              <span>
                No actions {inProgress && 'in progress'} were found

                {!all && (
                  <span>
                    {' '}
                    for the <b>{gitStatus.branchSummary?.current}</b> branch
                  </span>
                )}{' '}
                in the last {inProgress ? '30 minutes' : '24 hours'}
              </span>

              <Tag minimal>watcher is active</Tag>
            </div>
          )}

          {[...runs]
            .filter((run: Run) => !hiddenRuns.has(run.id))
            .sort((a: Run, b: Run) => {
              const timeA = new Date(a.created_at).getTime();
              const timeB = new Date(b.created_at).getTime();
              return timeB - timeA;
            })
            .map((run: Run) => (
              <Workflow
                key={run.id}
                onHide={hideRun}
                project={project}
                run={run}
              />
            ))}
        </>
      ),
    [runs, showActions, isEmpty, all, inProgress, gitStatus, project, hiddenRuns, hideRun]
  );

  return {
    Actions,
    getActions,
    showActions,
    toggleActions
  };
};
