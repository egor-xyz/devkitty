import { useEffect, useMemo, useState } from 'react';

import { GitStatus, Project } from 'types/project';

import { Workflow } from '../components/Workflow';

export const useActions = (gitStatus: GitStatus, project: Project) => {
  const [runs, setRuns] = useState([]);
  const [showActions, setShowActions] = useState(false);

  const getActions = async () => {
    const savedOrigin = localStorage.getItem(`GitResetModal:origin-${project.id}`);
    const filterBy = [gitStatus.branchSummary.current];
    if (savedOrigin) filterBy.push(savedOrigin);

    const res = await window.bridge.gitAPI.getAction(project.id, filterBy);
    console.log(res.runs);

    if (!res.success) {
      setShowActions(false);
      return;
    }

    setRuns(res.runs ?? []);
  };

  const toggleActions = () => setShowActions(!showActions);

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
    showActions,
    toggleActions
  };
};
