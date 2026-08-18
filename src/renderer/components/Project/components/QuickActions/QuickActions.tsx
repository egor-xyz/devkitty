import { Button, ButtonGroup, Classes, Tooltip } from '@blueprintjs/core';
import { type FC } from 'react';
import { ActionsIcon } from 'renderer/assets/gitHubIcons';
import { type GitStatus } from 'types/project';

type Props = {
  gitStatus: GitStatus;
  loading?: boolean;
  showDetails: boolean;
  showWorktrees: boolean;
  toggleDetails: () => void;
  toggleWorktrees: () => void;
};

export const QuickActions: FC<Props> = ({
  gitStatus,
  loading,
  showDetails,
  showWorktrees,
  toggleDetails,
  toggleWorktrees
}) => (
  <div className="flex gap-2 items-center">
    <ButtonGroup className={!gitStatus && Classes.SKELETON}>
      <Tooltip compact
        content={showWorktrees ? 'Hide worktrees' : 'Show worktrees'}
        hoverOpenDelay={500}
        placement="bottom"
      >
        <Button
          active={showWorktrees}
          aria-label={showWorktrees ? 'Hide worktrees' : 'Show worktrees'}
          aria-pressed={showWorktrees}
          icon="git-branch"
          onClick={toggleWorktrees}
        />
      </Tooltip>

      <Tooltip compact
        content={showDetails ? 'Hide actions & pull requests' : 'Show actions & pull requests'}
        hoverOpenDelay={500}
        placement="bottom"
      >
        <Button
          active={showDetails}
          aria-label={showDetails ? 'Hide actions & pull requests' : 'Show actions & pull requests'}
          aria-pressed={showDetails}
          icon={<ActionsIcon />}
          loading={loading}
          onClick={toggleDetails}
        />
      </Tooltip>
    </ButtonGroup>
  </div>
);
