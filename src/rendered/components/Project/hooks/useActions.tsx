import { useEffect, useMemo, useState } from 'react';

import { GitStatus, Project } from 'types/project';
import { appToaster } from 'rendered/utils/appToaster';
import { useAppSettings } from 'rendered/hooks/useAppSettings';

import { Workflow } from '../components/Workflow';

export const useActions = (gitStatus: GitStatus, project: Project) => {
  const [runs, setRuns] = useState([]);
  const [showActions, setShowActions] = useState(false);
  const { gitHubToken } = useAppSettings();

  const getActions = async () => {
    const savedOrigin = localStorage.getItem(`GitResetModal:origin-${project.id}`);
    const filterBy = [gitStatus.branchSummary.current];
    if (savedOrigin) filterBy.push(savedOrigin);

    const res = await window.bridge.gitAPI.getAction(project.id, filterBy);

    if (!res.success) {
      setShowActions(false);
      (await appToaster).show({
        intent: 'primary',
        message: `No actions found for ${project.name}`
      });
      return;
    }

    setRuns(res.runs ?? []);
  };

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
  }, [gitStatus, project, showActions]);

  const Actions = useMemo(
    () =>
      showActions &&
      runs.length > 0 && (
        <>
          {runs.map((run: any) => (
            <Workflow
              key={run.id}
              run={run}
            />
          ))}
        </>
      ),
    [runs, showActions]
  );

  return {
    Actions,
    getActions,
    showActions,
    toggleActions
  };
};
