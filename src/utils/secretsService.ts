import { ipcRenderer } from 'electron';

import { SECRETS_SERVICE_NAME } from 'utils';

export const setPassword = (account: string, password: string, service = SECRETS_SERVICE_NAME) => new Promise(resolve => {
  ipcRenderer.invoke('keytar', { account, action: 'setPassword', password, service }).then((res: any) => resolve(res));
});

export const getPassword = (account: string, service = SECRETS_SERVICE_NAME) => new Promise(resolve => {
  ipcRenderer.invoke('keytar', { account, action: 'getPassword', service }).then((res: any) => resolve(res));
});

export const deletePassword = (account: string, service = SECRETS_SERVICE_NAME) => new Promise(resolve => {
  ipcRenderer.invoke('keytar', { account, action: 'deletePassword', service }).then((res: any) => resolve(res));
});

export const findCredentials = (service = SECRETS_SERVICE_NAME) => new Promise<any[]>(resolve => {
  ipcRenderer.invoke('keytar', { action: 'findCredentials', service }).then((res: any) => resolve(res));
});

export const clearCredentials = async (service = SECRETS_SERVICE_NAME) => {
  const credentials = await findCredentials();
  credentials.map(({ account }) => deletePassword(account));
};