import { FC, useMemo } from 'react';
import { NumericInput, Switch } from '@blueprintjs/core';

import { useAppStore, useAppStoreDispatch } from 'context';

import css from '../../Settings.module.scss';

export const AutomationPanel: FC = () => {
  const { autoFetch, autoFetchInterval } = useAppStore();
  const dispatch = useAppStoreDispatch();
  return useMemo(() => (
    <div className={css.root}>
      <div className={css.sectionHeader}>Automation</div>

      <Switch
        checked={autoFetch}
        className={css.line}
        label='Auto fetch all projects (min)'
        large={true}
        onChange={() => dispatch({ payload: 'autoFetch', type: 'toggle' })}
      />
      <NumericInput
        disabled={!autoFetch}
        leftIcon='stopwatch'
        max={60}
        min={1}
        value={autoFetchInterval}
        onValueChange={val => dispatch({ payload: val, type: 'setAutoFetchInterval' })}
      />
    </div>
  ), [autoFetch, autoFetchInterval]); // eslint-disable-line
};