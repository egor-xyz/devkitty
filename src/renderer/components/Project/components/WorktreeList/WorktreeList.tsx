import { type FC } from 'react';
import { type GitStatus } from 'types/project';

import { WorktreeRow } from './WorktreeRow';

type Props = {
  gitStatus: GitStatus;
  id: string;
  name: string;
  onSuccess?: () => void;
};

export const WorktreeList: FC<Props> = ({ gitStatus, id, onSuccess }) => {
  const worktrees = gitStatus?.worktrees ?? [];
  const secondary = worktrees.filter((w) => !w.isMain);

  return (
    <div>
      {secondary.map((worktree) => (
        <WorktreeRow
          id={id}
          key={worktree.path}
          onSuccess={onSuccess}
          worktree={worktree}
        />
      ))}
    </div>
  );
};
