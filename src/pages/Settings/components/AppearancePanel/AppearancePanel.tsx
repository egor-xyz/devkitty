import { FC, useMemo } from 'react';
import { Divider, Switch } from '@blueprintjs/core';

import { DarkMode } from 'components/DarkMode';
import { useAppStore, useAppStoreDispatch } from 'context';

import css from '../../Settings.module.scss';

export const AppearancePanel: FC = () => {
  const { showLogo, snow, bottomBar } = useAppStore();
  const dispatch = useAppStoreDispatch();
  return useMemo(() => (
    <div className={css.root}>
      <div className={css.sectionHeader}>Theme</div>

      <DarkMode />

      <Divider className={css.divider} />

      <div className={css.sectionHeader}>Misc</div>

      <Switch
        checked={showLogo}
        label='Show Logo'
        large={true}
        onChange={() => dispatch({ payload: 'showLogo', type: 'toggle' })}
      />
      <Switch
        checked={bottomBar}
        label='Show Bottom Bar'
        large={true}
        onChange={() => dispatch({ payload: 'bottomBar', type: 'toggle' })}
      />
      <Switch
        checked={snow}
        label='Snow mode'
        large={true}
        onChange={() => dispatch({ payload: 'snow', type: 'toggle' })}
      />
    </div>
  ), [showLogo, snow, bottomBar]); // eslint-disable-line
};