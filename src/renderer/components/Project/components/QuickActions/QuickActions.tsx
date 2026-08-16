import { Button, ButtonGroup, Classes, Tooltip } from '@blueprintjs/core';
import { type FC } from 'react';
import { ActionsIcon } from 'renderer/assets/gitHubIcons';
import { useModal } from 'renderer/hooks/useModal';
import { type GitStatus, type Project } from 'types/project';

type Props = {
  gitStatus: GitStatus;
  loading?: boolean;
  onUpdate?: () => void;
  project: Project;
  showDetails: boolean;
  toggleDetails: () => void;
};

export const QuickActions: FC<Props> = ({
  gitStatus,
  loading,
  onUpdate,
  project,
  showDetails,
  toggleDetails
}) => {
  const { openModal } = useModal();

  return (
    <div className="flex gap-2 items-center">
      <ButtonGroup className={!gitStatus && Classes.SKELETON}>
        <Tooltip compact
          content="Add worktree"
          hoverOpenDelay={500}
          placement="bottom"
        >
          <Button
            icon="git-new-branch"
            loading={loading}
            onClick={() =>
              openModal({
                name: 'git:worktree:add',
                props: { gitStatus, id: project.id, name: project.name, onSuccess: onUpdate }
              })
            }
          />
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup className={!gitStatus && Classes.SKELETON}>
        <Tooltip compact
          content="Actions & pull requests"
          hoverOpenDelay={500}
          placement="bottom"
        >
          <Button
            active={showDetails}
            icon={<ActionsIcon />}
            loading={loading}
            onClick={toggleDetails}
          />
        </Tooltip>
      </ButtonGroup>
    </div>
  );
};
