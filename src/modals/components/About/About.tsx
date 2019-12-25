import { FC, useMemo } from 'react';
import { Dialog, Tag } from '@blueprintjs/core';
import { api } from 'electron-util';

import { DevKittyLogo } from 'assets/icons/svg';
import { useAppStore, useAppStoreDispatch } from 'context';

import css from './About.module.scss';

export const About: FC = () => {
  const state = useAppStore();
  const dispatch = useAppStoreDispatch();
  const { showAbout } = state;

  return useMemo(() => (
    <Dialog
      className={css.root}
      isOpen={showAbout}
      usePortal={false}
      onClose={() => dispatch({ type: 'toggleAbout' })}
    >
      <div className={css.wrap}>
        <h1>devkitty</h1>
        <DevKittyLogo className={css.logo} />
        <Tag>v{api.remote.app.getVersion()}</Tag>
        <div className={css.author}>By Egor Stronhin</div>
      </div>
    </Dialog>
  ), [showAbout]); // eslint-disable-line
};