import { Button, ButtonGroup, Classes, Tooltip } from '@blueprintjs/core';
import { type FC } from 'react';
import { useModal } from 'renderer/hooks/useModal';
import { type GitStatus, type Project } from 'types/project';

type Props = {
  gitStatus: GitStatus;
  loading?: boolean;
  onUpdate?: () => void;
  project: Project;
};

export const QuickActions: FC<Props> = ({ gitStatus, loading, onUpdate, project }) => {
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
    </div>
  );
};
