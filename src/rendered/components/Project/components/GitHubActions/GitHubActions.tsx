import { FC, useState } from 'react';

import { useMountEffect } from 'rendered/hooks/useMountEffect';
import { GitStatus, Project } from 'types/project';
import { appToaster } from 'rendered/utils/appToaster';

import { GitHubAction } from '../GitHubAction';

type Props = {
  gitStatus: GitStatus;
  project: Project;
  setActions: (actions: boolean) => void;
};

export const GitHubActions: FC<Props> = ({ gitStatus, project, setActions }) => {
  const [runs, setRuns] = useState([]);

  const getActions = async () => {
    const savedOrigin = localStorage.getItem(`GitResetModal:origin-${project.id}`);
    const filterBy = [gitStatus.branchSummary.current];
    if (savedOrigin) filterBy.push(savedOrigin);

    const res = await window.bridge.gitAPI.getAction(project.id, filterBy);
    console.log(res.runs);

    if (!res.success) {
      (await appToaster).show({
        intent: 'warning',
        message: res.message
      });

      setActions(false);

      return;
    }

    setRuns(res.runs ?? []);
  };

  useMountEffect(() => {
    getActions();
  });

  return (
    <>
      {runs.map((run: any) => (
        <GitHubAction
          key={run.id}
          run={run}
        />
      ))}
    </>
  );
};
