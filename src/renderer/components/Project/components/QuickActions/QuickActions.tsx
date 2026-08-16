import { Button, ButtonGroup, Classes, Tooltip } from '@blueprintjs/core';
import { type FC } from 'react';
import { ActionsIcon } from 'renderer/assets/gitHubIcons';
import { type GitStatus } from 'types/project';

type Props = {
  gitStatus: GitStatus;
  loading?: boolean;
  showDetails: boolean;
  toggleDetails: () => void;
};

export const QuickActions: FC<Props> = ({ gitStatus, loading, showDetails, toggleDetails }) => (
  <div className="flex gap-2 items-center">
    <ButtonGroup className={!gitStatus && Classes.SKELETON}>
      <Tooltip compact
        content={showDetails ? 'Collapse all' : 'Expand all'}
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
