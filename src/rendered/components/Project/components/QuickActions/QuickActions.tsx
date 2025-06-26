import { Button, ButtonGroup, Classes, Popover } from '@blueprintjs/core';
import { type FC, useState } from 'react';
import { ActionsIcon } from 'rendered/assets/gitHubIcons';
import { type GitStatus, type Project } from 'types/project';

import { GitMenu } from '../GitMenu';
import { OpenInMenu } from '../OpenInMenu';
import { StyledFaCopy, StyledFaRegCopy } from './QuickActions.styles';

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
  const [copyIcon, setCopyIcon] = useState(<StyledFaRegCopy size={size} />);

  const copyToClipboard = () => {
    setCopyIcon(<StyledFaCopy size={size} />);
    setTimeout(() => setCopyIcon(<StyledFaRegCopy size={size} />), 1000);

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
          <OpenInMenu
            gitStatus={gitStatus}
            project={project}
          />
        }
        placement="bottom"
      >
        <Button
          icon={'share'}
          loading={loading}
          title="Open in ..."
        />
      </Popover>

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
        active={showPulls}
        icon={'git-pull'}
        loading={loading}
        onClick={togglePulls}
        title="Pull Requests"
      />

      <Button
        active={showActions}
        icon={<ActionsIcon />}
        loading={loading}
        onClick={toggleActions}
        title="GitHub Actions"
      />
    </ButtonGroup>
  );
};
