import { Button, ButtonGroup, Classes, Popover } from '@blueprintjs/core';
import { FC, useState } from 'react';

import { GitStatus, Project } from 'types/project';

import { GitMenu } from '../GitMenu';
import { OpenInMenu } from '../OpenInMenu';
import { StyledFaCopy, StyledFaRegCopy } from './QuickActions.styles';

const size = 16;

type Props = {
  gitStatus: GitStatus;
  loading?: boolean;
  project: Project;
};

export const QuickActions: FC<Props> = ({ project, gitStatus, loading }) => {
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
        title={'Copy the branch name to clipboard'}
        onClick={copyToClipboard}
      />

      <Popover content={<OpenInMenu project={project} />}>
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
      >
        <Button
          icon={'git-merge'}
          loading={loading}
          title="Git actions"
        />
      </Popover>
    </ButtonGroup>
  );
};
