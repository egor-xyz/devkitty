import { Button, ButtonGroup, Classes } from '@blueprintjs/core';
import { Popover } from '@blueprintjs/core';
import { type FC, useState } from 'react';
import { FaCopy, FaRegCopy } from 'react-icons/fa';
import { ActionsIcon } from 'renderer/assets/gitHubIcons';
import { type GitStatus, type Project } from 'types/project';

import { GitMenu } from '../GitMenu';

const size = 16;

type Props = {
  gitStatus: GitStatus;
  loading?: boolean;
  project: Project;
  showActions: boolean;
  showPulls: boolean;
  toggleActions: () => void;
  togglePulls: () => void;
};

export const QuickActions: FC<Props> = ({
  gitStatus,
  loading,
  project,
  showActions,
  showPulls,
  toggleActions,
  togglePulls
}) => {
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
    <ButtonGroup className={!gitStatus && Classes.SKELETON}>
      <Button
        icon={copyIcon}
        loading={loading}
        onClick={copyToClipboard}
        title={'Copy the branch name to clipboard'}
      />

      <Popover
        content={
          <GitMenu
            gitStatus={gitStatus}
            project={project}
          />
        }
        placement="bottom"
      >
        <Button
          icon={'git-merge'}
          loading={loading}
          title="Git actions"
        />
      </Popover>

      <Button
        active={showActions}
        icon={<ActionsIcon />}
        loading={loading}
        onClick={toggleActions}
        title="GitHub Actions"
      />

      <Button
        active={showPulls}
        icon={'git-pull'}
        loading={loading}
        onClick={togglePulls}
        title="Pull Requests"
      />
    </ButtonGroup>
  );
};
