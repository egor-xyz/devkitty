import { FC, memo, useEffect, useRef } from 'react';
import { api } from 'electron-util';

import { useAppStore, useAppStoreDispatch } from 'context';
import { scanFolders } from 'utils';

export const AutoFetch: FC = memo(() => {
  const state = useAppStore();
  const dispatch = useAppStoreDispatch();

  const id = useRef<number>();
  const onPowerMonitorSubscribed = useRef(false);
  const interval = useRef(1);

  const unsubscribeAutoFetch = () => {
    clearInterval(id.current);
    id.current = undefined;
  };

  const subscribeAutoFetch = () => {
    id.current = window.setInterval(() => {
      scanFolders({ dispatch, state, useLoader: false });
    }, interval.current * 60 * 1000);
  };

  const autoFetchProjects = () => {
    const { autoFetch, projectsSrc, autoFetchInterval } = state;

    if (!autoFetch || !navigator.onLine) {
      unsubscribeAutoFetch();
      return;
    }

    if (!projectsSrc.length) return;

    if (id.current && interval.current !== autoFetchInterval) {
      unsubscribeAutoFetch();
      interval.current = autoFetchInterval;
      subscribeAutoFetch();
      return;
    }

    if (id.current) return;

    interval.current = autoFetchInterval;
    subscribeAutoFetch();
  };

  const onPowerMonitor = () => {
    if (onPowerMonitorSubscribed.current) return;
    onPowerMonitorSubscribed.current = true;

    api.remote.powerMonitor.on('resume', autoFetchProjects);
    api.remote.powerMonitor.on('suspend', unsubscribeAutoFetch);

    window.addEventListener('online', autoFetchProjects);
    window.addEventListener('offline', unsubscribeAutoFetch);
  };

  useEffect(() => {
    autoFetchProjects();
    onPowerMonitor();
  }, []); // eslint-disable-line

  return null;
});
