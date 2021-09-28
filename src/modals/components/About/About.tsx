import { FC, useCallback, useEffect, useState } from 'react';
import { Dialog, Tag } from '@blueprintjs/core';
import { ipcRenderer } from 'electron';

import { DevKittyLogo } from 'assets/icons/svg';
import { useAppStore, useAppStoreDispatch } from 'context';

import css from './About.module.scss';

export const About: FC = () => {
  const state = useAppStore();
  const dispatch = useAppStoreDispatch();
  const { showAbout } = state;
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    ipcRenderer.invoke('getAppData').then(({ version }) => {
      setVersion(version);
    });
  }, []);

  const onClose = useCallback(() => dispatch({ type: 'toggleAbout' }), []);

  return (
    <Dialog
      className={css.root}
      isOpen={showAbout}
      usePortal={false}
      onClose={onClose}
    >
      <div className={css.wrap}>
        <h1>devkitty</h1>
        <DevKittyLogo className={css.logo} />
        <Tag>v{version}</Tag>
        <div className={css.author}>By Egor Stronhin</div>
      </div>
    </Dialog>
  );
};