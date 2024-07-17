import { useCallback, useEffect, useMemo, useState } from 'react';
import { Classes, Tag } from '@blueprintjs/core';

import { GitStatus, Project } from 'types/project';
import { appToaster } from 'rendered/utils/appToaster';
import { useAppSettings } from 'rendered/hooks/useAppSettings';
import { Run } from 'types/gitHub';

import { Workflow } from '../../components/Workflow';
import { Empty } from './useActions.styles';

export const useActions = (gitStatus: GitStatus, project: Project) => {
  const [runs, setRuns] = useState([]);
  const [showActions, setShowActions] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);
  const {
    gitHubToken,
    gitHubActions: { all, inProgress }
  } = useAppSettings();

  const getActions = useCallback(async () => {
    const savedOrigin = localStorage.getItem(`GitResetModal:origin-${project.id}`);
    const filterBy = [gitStatus.branchSummary.current];
    if (savedOrigin) filterBy.push(savedOrigin);

    const res = await window.bridge.gitAPI.getAction(project.id, filterBy);

    if (!res.success) {
      setIsEmpty(true);
      return;
    }

    setIsEmpty(false);
    setRuns(res.runs ?? []);
  }, [gitStatus, project.id]);

  const toggleActions = async () => {
    if (!showActions && !gitHubToken) {
      (await appToaster).show({
        intent: 'warning',
        message: 'Set GitHub token in settings to see actions'
      });
      return;
    }
    setShowActions(!showActions);
  };

  useEffect(() => {
    if (!showActions || !gitStatus?.branchSummary.current || !project.id) return;
    getActions();
  }, [getActions, gitStatus, project, showActions]);

  const Actions = useMemo(
    () =>
      showActions && (
        <>
          {isEmpty && runs.length < 1 && (
            <Empty className={Classes.TEXT_MUTED}>
              <span>
                No actions {inProgress && 'in progress'} were found
                {!all && (
                  <>
                    &nbsp;for the&nbsp;<b>{gitStatus.branchSummary?.current}</b>&nbsp;branch
                  </>
                )}
                &nbsp;in the last {inProgress ? '30 minutes' : '24 hours'}
              </span>
              <Tag minimal>watcher is active</Tag>
            </Empty>
          )}

          {runs.map((run: Run) => (
            <Workflow
              key={run.id}
              run={run}
            />
          ))}
        </>
      ),
    [runs, showActions, isEmpty, all, inProgress, gitStatus]
  );

  return {
    Actions,
    getActions,
    showActions,
    toggleActions
  };
};
