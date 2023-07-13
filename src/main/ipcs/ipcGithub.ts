import { ipcMain, shell } from 'electron';

import keychain from 'keychain';
import axios from 'axios';

type AuthData = {
  device_code: string;
  expires_in: number;
  interval: number;
  user_code: string;
  verification_uri: string;
};
let authData: AuthData;

const headers = {
  Accept: 'application/json'
};

ipcMain.handle('github:getCode', async () => {
  // try {
  //   // Accept: application/json
  //   const res = await axios.post<AuthData>(
  //     'https://github.com/login/device/code',
  //     {
  //       client_id: process.env.GITHUB_CLIENT_ID,
  //       scope: 'workflow'
  //     },
  //     { headers }
  //   );

  //   authData = res.data;

  //   return {
  //     expires_in: res.data.expires_in,
  //     user_code: res.data.user_code
  //   };
  // } catch (e) {
  //   return { error: e.message };
  // }
  keychain.setPassword(
    {
      account: 'github',
      password: '123456',
      service: 'devkitty'
    },
    () => {}
  );
});

ipcMain.handle('github:login', async () => {
  const res = shell.openExternal(authData.verification_uri);
  console.log(res, 'res');
});

ipcMain.handle('github:token', async () => {
  const res = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      device_code: authData.device_code,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
    },
    { headers }
  );
  console.log(res, 'res');
});
