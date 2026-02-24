import { Button, ButtonGroup, Classes, Tooltip } from '@blueprintjs/core';
import { type FC, useState } from 'react';
import { FaCopy, FaRegCopy } from 'react-icons/fa';
import { ActionsIcon } from 'renderer/assets/gitHubIcons';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { useModal } from 'renderer/hooks/useModal';
import { type GitStatus, type Project } from 'types/project';

const size = 16;

type Props = {
  gitStatus: GitStatus;
  loading?: boolean;
  onUpdate?: () => void;
  project: Project;
  showActions: boolean;
  showPulls: boolean;
  toggleActions: () => void;
  togglePulls: () => void;
};

export const QuickActions: FC<Props> = ({
  gitStatus,
  loading,
  onUpdate,
  project,
  showActions,
  showPulls,
  toggleActions,
  togglePulls
}) => {
  const { openModal } = useModal();
  const { set, showWorktrees } = useAppSettings();
  const [copyIcon, setCopyIcon] = useState(
    <FaRegCopy
      className="text-bp-gray-1 dark:text-bp-gray-4"
      size={size}
    />
  );

  const copyToClipboard = () => {
    setCopyIcon(
      <FaCopy
        className="text-bp-gray-1 dark:text-bp-gray-4"
        size={size}
      />
    );
    setTimeout(
      () =>
        setCopyIcon(
          <FaRegCopy
            className="text-bp-gray-1 dark:text-bp-gray-4"
            size={size}
          />
        ),
      1000
    );

    navigator.clipboard.writeText(gitStatus?.branchSummary?.current);
  };

  return (
    <div className="flex gap-2 items-center">
      <ButtonGroup className={!gitStatus && Classes.SKELETON}>
        <Tooltip compact
          content="Copy branch name"
          hoverOpenDelay={500}
          placement="bottom"
        >
          <Button
            icon={copyIcon}
            loading={loading}
            onClick={copyToClipboard}
          />
        </Tooltip>

        <Tooltip compact
          content="Add worktree"
          hoverOpenDelay={500}
          placement="bottom"
        >
          <Button
            icon="git-new-branch"
            loading={loading}
            onClick={() => openModal({ name: 'git:worktree:add', props: { gitStatus, id: project.id, name: project.name, onSuccess: onUpdate } })}
          />
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup className={!gitStatus && Classes.SKELETON}>
        <Tooltip compact
          content="Worktrees"
          hoverOpenDelay={500}
          placement="bottom"
        >
          <Button
            active={showWorktrees}
            icon="diagram-tree"
            loading={loading}
            onClick={() => set({ showWorktrees: !showWorktrees })}
          />
        </Tooltip>

        <Tooltip compact
          content="GitHub Actions"
          hoverOpenDelay={500}
          placement="bottom"
        >
          <Button
            active={showActions}
            icon={<ActionsIcon />}
            loading={loading}
            onClick={toggleActions}
          />
        </Tooltip>

        <Tooltip compact
          content="Pull Requests"
          hoverOpenDelay={500}
          placement="bottom"
        >
          <Button
            active={showPulls}
            icon={'git-pull'}
            loading={loading}
            onClick={togglePulls}
          />
        </Tooltip>
      </ButtonGroup>
    </div>
  );
};
