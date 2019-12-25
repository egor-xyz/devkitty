import { remote } from 'electron';
import Keytar from 'keytar';

import { SECRETS_SERVICE_NAME } from 'utils';

const keytar: typeof Keytar = remote.require('keytar');

export const setPassword = (account: string, password: string, service = SECRETS_SERVICE_NAME ) =>
  keytar.setPassword(service, account, password)
;

export const getPassword = (account: string, service = SECRETS_SERVICE_NAME ) =>
  keytar.getPassword(service, account)
;

export const deletePassword = (account: string, service = SECRETS_SERVICE_NAME ) =>
  keytar.deletePassword(service, account)
;

export const findCredentials = (service = SECRETS_SERVICE_NAME) => keytar.findCredentials(service);

export const clearCredentials = async (service = SECRETS_SERVICE_NAME) => {
  const credentials = await findCredentials();
  credentials.map(({ account }) => deletePassword(account));
};