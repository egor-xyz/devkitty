import { BrowserWindow } from 'electron';
import os from 'os';

// @ts-ignore
import { getMacInstalledApps } from 'get-installed-apps';
import { isEqual } from 'lodash';

import { FoundShell } from 'types/foundShell';

import { settings } from '../../settings';
import { FoundEditor } from '../../../types/foundEditor';
import { editorIds } from './editors';
import { shellIds } from './shells';

type Apps = Array<{
  appIdentifier: string;
  appName: string;
  kMDItemFSName: string;
}>;

export const updateEditorsAndShells = async (mainWindow: BrowserWindow) => {
  const apps1: Apps = await getMacInstalledApps();
  const apps2: Apps = (await getMacInstalledApps(`${os.homedir()}/Applications`)) ?? [];
  const apps = [...apps1, ...apps2];

  const editors: FoundEditor[] = apps
    .filter(({ appIdentifier }) => editorIds.includes(appIdentifier))
    .map(({ kMDItemFSName, appName }) => ({
      editor: appName,
      path: `/Applications/${kMDItemFSName}`
    }));

  // log.info('Available editors', editors);
  settings.set('appSettings.editors', editors);

  if (
    !settings.get('appSettings.selectedEditor') ||
    !editors.find((editor) => isEqual(editor, settings.get('appSettings.selectedEditor')))
  ) {
    settings.set('appSettings.selectedEditor', editors[0]);
  }

  const shells: FoundShell<string>[] = apps
    .filter(({ appIdentifier }) => shellIds.includes(appIdentifier))
    .map(({ kMDItemFSName, appName }) => ({
      path: `/Applications/${kMDItemFSName}`,
      shell: appName
    }));

  // add default macOS terminal
  shells.push({
    path: '/Applications/Utilities/Terminal.app',
    shell: 'Terminal'
  });

  // log.info('Available shells', shells);
  settings.set('appSettings.shells', shells);

  if (
    !settings.get('appSettings.selectedShell') ||
    !shells.find((shell) => isEqual(shell, settings.get('appSettings.selectedShell')))
  ) {
    settings.set('appSettings.selectedShell', shells[0]);
  }

  mainWindow.webContents.send('settings:updated', settings.get('appSettings'));
};
