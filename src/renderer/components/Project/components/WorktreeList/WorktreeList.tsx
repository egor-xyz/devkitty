import { type FC } from 'react';
import { type GitStatus } from 'types/project';

import { WorktreeRow } from './WorktreeRow';

type Props = {
  gitStatus: GitStatus;
  id: string;
  name: string;
};

export const WorktreeList: FC<Props> = ({ gitStatus, id }) => {
  const worktrees = gitStatus?.worktrees ?? [];
  const secondary = worktrees.filter((w) => !w.isMain);

  return (
    <div>
      {secondary.map((worktree) => (
        <WorktreeRow
          id={id}
          key={worktree.path}
          worktree={worktree}
        />
      ))}
    </div>
  );
};
