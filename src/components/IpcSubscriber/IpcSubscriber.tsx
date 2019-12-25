import { FC, useEffect, useRef } from 'react';
import { ipcRenderer, IpcRenderer } from 'electron';
import { useHistory } from 'react-router';

import { AppStoreState, useAppStore, useAppStoreDispatch } from 'context';
import { addFolder, addFolders, exportAllSettings, importAllSettings, scanFolders } from 'utils';

export const IpcSubscriber:FC = () => {
  const state = useAppStore();
  const dispatch = useAppStoreDispatch();
  const subscribeDispatchID = useRef<IpcRenderer>();
  const history = useHistory();

  const onIpcRenderer = () => {
    if (subscribeDispatchID.current) return;

    // Calls from menu
    subscribeDispatchID.current = ipcRenderer.on('dispatch', async (_, type, payload: keyof AppStoreState) => {
      switch (type) {
        case 'addFolder': {
          const res = await addFolder(state, dispatch);
          if (!res) return;
          scanFolders({ dispatch, state });
          return;
        }
        case 'addFolders': {
          const res = await addFolders(state, dispatch);
          if (!res) return;
          scanFolders({ dispatch, state });
          return;
        }
        case 'viewLicense': {
          history.push({ pathname: '/licenses' });
          return;
        }
        case 'scanFolders': {
          await scanFolders({ dispatch, state });
          return;
        }
        case 'importSettings':
          importAllSettings();
          return;
        case 'exportSetttings':
          exportAllSettings();
          return;
        default:
          dispatch({ payload, type });
      }
    });

    // Update downloaded
    ipcRenderer.on('updater', (event, data) => {
      if (data.msg) console.log(data.msg, data);
      if (data.type !== 'Downloaded') return;
      dispatch({ payload: data.version, type: 'setAppUpdated' });
    });

    // open from browser url x-devkitty://
    ipcRenderer.on('open-url', (event, url) => {
      console.log('open-url:', url);
    });
  };

  useEffect(() => {
    onIpcRenderer();
  }, []); // eslint-disable-line

  return null;
};