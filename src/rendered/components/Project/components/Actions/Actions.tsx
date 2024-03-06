import { FC, useState } from 'react';

import { useMountEffect } from 'rendered/hooks/useMountEffect';
import { GitStatus, Project } from 'types/project';
import { appToaster } from 'rendered/utils/appToaster';

import { Root } from './Actions.styles';

type Props = {
  gitStatus: GitStatus;
  project: Project;
  setActions: (actions: boolean) => void;
};

export const Actions: FC<Props> = ({ gitStatus, project, setActions }) => {
  const [runs, setRuns] = useState([]);

  const getActions = async () => {
    const savedOrigin = localStorage.getItem(`GitResetModal:origin-${project.id}`);
    const filterBy = [gitStatus.branchSummary.current];
    if (savedOrigin) filterBy.push(savedOrigin);

    const res = await window.bridge.gitAPI.getAction(project.id, filterBy);
    console.log(res);

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
      {runs.map(({ id, display_title }: any) => (
        <Root key={id}>{display_title}</Root>
      ))}
    </>
  );
};
