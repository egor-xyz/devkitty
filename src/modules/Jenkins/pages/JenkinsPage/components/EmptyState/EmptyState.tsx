import { FC, useMemo } from 'react';
import { Button, NonIdealState } from '@blueprintjs/core';

import { useAppStore } from 'context';

interface Props {
  resetAndRefresh():void;
}

export const EmptyState: FC<Props> = ({ resetAndRefresh }) => {
  const { online } = useAppStore();
  return useMemo(() => (
    <NonIdealState
      action={
        <Button
          icon={'refresh'}
          text={'Reset filters and refresh'}
          onClick={resetAndRefresh}
        />
      }
      description={online
        ? 'Try to refresh or add project(s)'
        : ''
      }
      icon={online
        ? 'folder-open'
        : 'globe-network'
      }
      title={online
        ? 'No projects found'
        : 'No internet connection'
      }
    />
  ), [online]); // eslint-disable-line
};