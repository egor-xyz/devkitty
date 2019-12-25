import { FC, useMemo } from 'react';
import { Alignment, Button, ButtonGroup, Classes, Icon, NavbarGroup, Spinner } from '@blueprintjs/core';
import { api, is } from 'electron-util';
import clsx from 'clsx';

import { useAppStore, useAppStoreDispatch } from 'context';

import css from './BottomBar.module.scss';

const updateApp = () => {
  const macOs = is.macos;

  if (macOs) {
    api.ipcRenderer.send('quitAndInstall');
    return;
  }

  api.shell.openExternal('https://devkitty.app/');
};

export const BottomBar:FC = () => {
  const { loading, appStatus, bottomBar, appUpdated, logIntent, online } = useAppStore();
  const dispatch = useAppStoreDispatch();

  const hidden = !bottomBar && !appUpdated && !appUpdated && online;
  const isLoading = Object.values(loading).includes(true);

  return useMemo(() => {
    return (
      <div className={clsx(css.root, { [css.hidden]: hidden })}>
        <div className={clsx(css.content, { [css.contentHidden]: hidden })} >
          <NavbarGroup
            align={Alignment.LEFT}
            className={css.group}
          >
            {!online && (
              <Button
                className={css.appOffline}
                icon='warning-sign'
                intent={'danger'}
                small={true}
                text='No internet connection'
              />
            )}

            {appUpdated && (
              <Button
                className={css.appUpdated}
                icon='flame'
                intent={'primary'}
                small={true}
                text={'New release' + (appUpdated ? ` v${appUpdated}` : '')}
                onClick={updateApp}
              />
            )}

            {isLoading && !appStatus && (<>
              <Spinner
                className={css.spinner}
                size={4}
              />
            </>)}

            {appStatus && (
              <div className={css.folder}>
                <Icon
                  className={css.folder_icon}
                  icon='comment'
                  iconSize={12}
                />
                <span>{appStatus}</span>
              </div>
            )}
          </NavbarGroup>

          <NavbarGroup
            align={Alignment.RIGHT}
            className={css.group}
          >
            <ButtonGroup>
              {/*<Button*/}
              {/*  className={clsx(css.btn, Classes.MINIMAL)}*/}
              {/*  icon={'console'}*/}
              {/*  intent={logIntent}*/}
              {/*  small={true}*/}
              {/*  onClick={() => dispatch({ type: 'toggleLog' })}*/}
              {/*/>*/}

              <a
                className={clsx(css.btn, Classes.MINIMAL, 'bp3-button', 'bp3-small')}
                href='mailto:info@devkitty.app'
              >
                <Icon icon='envelope' /> {/* eslint-disable-line */}
              </a>
            </ButtonGroup>
          </NavbarGroup>
        </div>

        <Button
          active={true}
          className={css.showHideIcon}
          icon={hidden ? 'chevron-up' : 'chevron-down'}
          minimal={true}
          onClick={() => dispatch({ payload: 'bottomBar', type: 'toggle' })}
        />
      </div>
    );
  }, [loading, appStatus, bottomBar, appUpdated, logIntent, online, isLoading]); // eslint-disable-line
};