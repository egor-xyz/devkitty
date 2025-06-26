import { type BrowserWindow } from 'electron';
import { isEqual } from 'lodash';
import os from 'os';
import { type FoundShell } from 'types/foundShell';

import { type FoundEditor } from '../../../types/foundEditor';
import { settings } from '../../settings';
import { editorNames } from './editors';
import { getInstalledApps } from './getInstalledApps';
import { shellNames } from './shells';

export const updateEditorsAndShells = async (mainWindow: BrowserWindow) => {
  const apps1 = await getInstalledApps('/Applications');
  const apps2 = await getInstalledApps(`${os.homedir()}/Applications`);
  const apps = [...apps1, ...apps2];

  const editors: FoundEditor[] = editorNames
    .map((editor) => {
      const path = apps.find((app) => app.includes(editor));
      if (!path) return undefined;

      return {
        editor,
        path
      };
    })
    .filter((editor) => editor) as FoundEditor[];

  settings.set('appSettings.editors', editors);

  if (
    !settings.get('appSettings.selectedEditor') ||
    !editors.find((editor) => isEqual(editor, settings.get('appSettings.selectedEditor')))
  ) {
    settings.set('appSettings.selectedEditor', editors[0]);
  }

  const shells: FoundShell<string>[] = shellNames
    .map((shell) => {
      const path = apps.find((app) => app.includes(shell));
      if (!path) return undefined;

      return {
        path,
        shell
      };
    })
    .filter((shell) => shell) as FoundShell<string>[];

  // add default macOS terminal
  shells.push({
    path: '/Applications/Utilities/Terminal.app',
    shell: 'Terminal'
  });

  settings.set('appSettings.shells', shells);

  if (
    !settings.get('appSettings.selectedShell') ||
    !shells.find((shell) => isEqual(shell, settings.get('appSettings.selectedShell')))
  ) {
    settings.set('appSettings.selectedShell', shells[0]);
  }

  mainWindow.webContents.send('settings:updated', settings.get('appSettings'));
};
