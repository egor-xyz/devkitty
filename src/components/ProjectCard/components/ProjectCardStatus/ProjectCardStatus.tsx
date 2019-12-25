import { FC } from 'react';
import clsx from 'clsx';
import { Icon, Tooltip } from '@blueprintjs/core';

import { Project } from 'models';
import { getCurrentBranch } from 'utils';

interface Props {
  loading: boolean;
  project: Project;
  setShowInfo(val: boolean): void;
}

export const ProjectCardStatus:FC<Props> = (
  { loading, setShowInfo, project, project: { repo, git, status } }
) => {
  const currentBranch = getCurrentBranch(project);

  return (
    <div className={clsx({ 'bp3-skeleton': loading })}>
      <span
        className='name'
        onClick={() => setShowInfo(true)}
      >
        {repo}
      </span>

      {!currentBranch?.remote && !git?.organization && (
        <Tooltip
          content='Local git'
          targetClassName='ml'
        >
          <Icon
            icon='cloud-upload'
            intent='danger'
          />
        </Tooltip>
      )}

      {!project.status.tracking && (
        <Tooltip
          content='Untracked branch'
          targetClassName='ml'
        >
          <Icon
            icon='issue'
            intent='danger'
          />
        </Tooltip>
      )}

      {!!status.modified.length && (<>
        <Tooltip
          content={`${repo} has uncommitted changes`}
          targetClassName='ml'
        >
          <Icon
            icon='arrow-up'
            intent='danger'
          />
        </Tooltip>
      </>)}
    </div>
  );
};