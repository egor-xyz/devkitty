import { Dispatch } from 'react';
import { ipcRenderer } from 'electron';

import { AppStoreActions } from 'context';

let subscribed = false;

export const internetStatus = async (dispatch: Dispatch<AppStoreActions>) => {
  if (subscribed) return;
  subscribed = true;

  const onlineStatusChanged = () => {
    dispatch({ payload: navigator.onLine, type: 'setOnline' });
    ipcRenderer.invoke('dockSetBadge', navigator.onLine ? '' : '⚠️');
    ipcRenderer.send('online-status-changed', navigator.onLine);
  };

  window.addEventListener('online', onlineStatusChanged);
  window.addEventListener('offline', onlineStatusChanged);
};