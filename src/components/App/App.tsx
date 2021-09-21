import { FC, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { Router } from 'react-router-dom';
import { remote } from 'electron';
import { api, darkMode, is } from 'electron-util';
import { createHashHistory } from 'history';

import { AllProviders, AutoFetch, BottomBar, Header, IpcSubscriber } from 'components';
import { Modals } from 'modals';
import { internetStatus, subscribe, unsubscribe, visitor } from 'utils';
import { useAppStore, useAppStoreDispatch } from 'context';
import { Routes } from 'pages';

import css from './App.module.scss';

// Init info
visitor.event(remote.process.platform, 'version', remote.app.getVersion()).send();

// Page views
const history = createHashHistory();
history.location.hash && visitor.pageview(history.location.pathname).send();
history.listen(() => {
  visitor.pageview(history.location.pathname).send();
});

export const App: FC = () => {
  const { darkMode: _darkMode, darkModeOS, bottomBar } = useAppStore();
  const dispatch = useAppStoreDispatch();

  const platform = useMemo(() => api.remote.process.platform, []);

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
    document.body.classList.add(platform);

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
