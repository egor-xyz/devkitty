import { Dispatch } from 'react';
import { find } from 'lodash';
import { api } from 'electron-util';

import { AppStoreActions } from 'context';
import { requestClient } from 'api';

export interface File {
  browser_download_url: string;
}

export interface GitResponse {
  assets: File[];
  name: string;
}

const GITHUB_LATEST_RELEASE_URL = 'https://api.github.com/repos/egor-xyz/devkitty-app/releases/latest';

let done = false;
const CHECK_UPDATE_INTERVAL = (1000 * 60) * 15;
let intervalId: number | undefined;

export const autoUpdater = async (dispatch: Dispatch<AppStoreActions>) => {
  if (done) return;
  done = true;

  const res = await requestClient<GitResponse>('get', GITHUB_LATEST_RELEASE_URL);
  if (!res.success || !res.data) return;

  const file = find(res.data.assets, (file) => file.browser_download_url.includes('.dmg'));
  if (!file) return;

  const currentVersion = api.remote.app.getVersion();
  const newVersion = res.data.name;

  if (currentVersion < newVersion) {
    if (intervalId) clearInterval(intervalId);
    dispatch({ payload: newVersion, type: 'setAppUpdated' });
    return;
  }

  if (intervalId) return;
  intervalId = setInterval(autoUpdater, CHECK_UPDATE_INTERVAL);
};