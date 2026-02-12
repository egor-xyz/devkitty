import { type FC } from 'react';
import { type GitStatus } from 'types/project';

import { GitStatusBadge } from '../GitStatusBadge';

type Props = {
  gitStatus: GitStatus;
  name: string;
};

export const GitStatusGroup: FC<Props> = ({ gitStatus, name }) => {
  const changedFiles = gitStatus?.status.modified.length ?? 0;
  const ahead = gitStatus?.status.ahead ?? 0;
  const behind = gitStatus?.status.behind ?? 0;

  return (
    <div className="flex select-none">
      <GitStatusBadge
        count={changedFiles}
        icon="document"
        intent="danger"
        show={Boolean(changedFiles)}
        tooltip={
          <>
            <b>{name}</b> has <b>{changedFiles}</b> uncommited changed file{changedFiles > 1 ? 's' : ''}
          </>
        }
      />

      <GitStatusBadge
        count={ahead}
        icon="arrow-up"
        intent="warning"
        show={Boolean(ahead)}
        tooltip={
          <>
            <b>{name}</b> has <b>{ahead}</b> ahead commit{ahead > 1 ? 's' : ''}
          </>
        }
      />

      <GitStatusBadge
        count={behind}
        icon="arrow-down"
        intent="primary"
        show={Boolean(behind)}
        tooltip={
          <>
            <b>{name}</b> has <b>{behind}</b> behind commit{behind > 1 ? 's' : ''}
          </>
        }
      />
    </div>
  );
};
