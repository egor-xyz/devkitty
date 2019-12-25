import { FC, useEffect } from 'react';
import clsx from 'clsx';
import { Router } from 'react-router-dom';
import { remote } from 'electron';
import { api, darkMode, is } from 'electron-util';
import { GlobalHotKeys } from 'react-hotkeys';
import { createHashHistory } from 'history';

import { AllProviders, AutoFetch, BottomBar, Header, IpcSubscriber } from 'components';
import { Modals } from 'modals';
import { autoUpdater, internetStatus, subscribe, unsubscribe, visitor } from 'utils';
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
  const platform = api.remote.process.platform;

  _darkMode ? document.body.classList.add('bp3-dark') : document.body.classList.remove('bp3-dark');
  if (is.macos) darkModeOS ? subscribe(dispatch) : unsubscribe();

  useEffect(() => {
    document.body.classList.add(platform);

    // Updater for notMac Platforms
    if (!is.macos) autoUpdater(dispatch);

    // Online/Offline status
    internetStatus(dispatch);

    // macOS theme changed listener
    if (is.macos) {
      if (darkModeOS && _darkMode !== darkMode.isEnabled) {
        dispatch({ payload: darkMode.isEnabled, type: 'setDarkMode' });
      }
    }
  }, []); // eslint-disable-line

  return (
    <div
      className={clsx(css.root, {
        [css.dark]: _darkMode,
        bottomBar
      })}
    >
      <AllProviders>
        <Router history={history}>
          <GlobalHotKeys
            allowChanges={true}
            handlers={{ snow: () => dispatch({ payload: 'snow', type: 'toggle' }) }}
            keyMap={{ snow: 's n o w' }}
          >
            <Modals />
            <Header />
            <Routes />
            <BottomBar />
            <AutoFetch />
            <IpcSubscriber />
          </GlobalHotKeys>
        </Router>
      </AllProviders>
    </div>);
};
