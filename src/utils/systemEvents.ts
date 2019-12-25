import { Dispatch } from 'react';
import { api, darkMode } from 'electron-util';

import { AppStoreActions } from 'context';

let subId: number | undefined;
export const subscribe = (dispatch: Dispatch<AppStoreActions>) => {
  if (subId) return;
  subId = api.systemPreferences.subscribeNotification('AppleInterfaceThemeChangedNotification', () => {
    dispatch({ payload: darkMode.isEnabled, type: 'setDarkMode' });
  });
};
export const unsubscribe = () => {
  if (!subId) return;
  api.systemPreferences.unsubscribeNotification(subId);
  subId = undefined;
};
