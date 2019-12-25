import { FC } from 'react';
import { Icon, NonIdealState } from '@blueprintjs/core';

import { useAppStore, useAppStoreDispatch } from 'context';

import { LogItem } from './components';
import { StyledDrawer } from './Log.styles';

export const Log: FC = () => {
  const { showLog, logs } = useAppStore();
  const dispatch = useAppStoreDispatch();
  return (
    <StyledDrawer
      canOutsideClickClose={true}
      hasBackdrop={true}
      isOpen={showLog}
      position={'bottom'}
      size='300px'
      onClose={() => dispatch({ payload: 'showLog', type: 'toggle' })}
    >
      {!logs.length && (
        <NonIdealState
          icon={'console'}
          title={'Log is empty'}
        />
      )}
      <div className='root'>
        {logs.map((log, key) => (
          <LogItem
            key={key}
            log={log}
          />
        ))}
      </div>

      {!!logs.length && (
        <Icon
          className='clear'
          icon={'trash'}
          onClick={() => dispatch({ type: 'clearLog' })}
        />
      )}
    </StyledDrawer>
  );
};