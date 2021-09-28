import { FC, useEffect } from 'react';
import clsx from 'clsx';
import { Router } from 'react-router-dom';
import { darkMode, is } from 'electron-util';
import { createHashHistory } from 'history';
import { ipcRenderer } from 'electron';

import { AllProviders, AutoFetch, BottomBar, Header, IpcSubscriber } from 'components';
import { Modals } from 'modals';
import { internetStatus, subscribe, unsubscribe, visitor } from 'utils';
import { useAppStore, useAppStoreDispatch } from 'context';
import { Routes } from 'pages';

import css from './App.module.scss';

const history = createHashHistory();
history.location.hash && visitor.pageview(history.location.pathname).send();
history.listen(() => {
  visitor.pageview(history.location.pathname).send();
});

export const App: FC = () => {
  const { darkMode: _darkMode, darkModeOS, bottomBar } = useAppStore();
  const dispatch = useAppStoreDispatch();

  useEffect(() => {
    if (!is.macos) return;
    darkModeOS
      ? subscribe(dispatch)
      : unsubscribe();
  }, [darkModeOS]);

  useEffect(() => {
    if (_darkMode) {
      document.body.classList.add('bp3-dark');
    } else {
      document.body.classList.remove('bp3-dark');
    }
  }, [_darkMode]);

  useEffect(() => {
    ipcRenderer.invoke('getAppData').then(({ platform, version }) => {
      document.body.classList.add(platform);
      visitor.event(platform, 'version', version).send();
    });

    internetStatus(dispatch);

    if (is.macos && darkModeOS && _darkMode !== darkMode.isEnabled) {
      dispatch({ payload: darkMode.isEnabled, type: 'setDarkMode' });
    }
  }, []);

  return (
    <div
      className={clsx(css.root, {
        [css.dark]: _darkMode,
        bottomBar
      })}
    >
      <AllProviders>
        <Router history={history}>
          <Modals />
          <Header />
          <Routes />
          <BottomBar />
          <AutoFetch />
          <IpcSubscriber />
        </Router>
      </AllProviders>
    </div>);
};
