import { isEqual } from 'lodash';

import { getAvailableEditors } from '../libs/editors/darwin';
import { settings } from '../settings';
import { getAvailableShells } from '../libs/shells/darwin';

const updateEditors = async () => {
  const editors = await getAvailableEditors();
  settings.set('appSettings.editors', editors);
  if (
    !settings.get('appSettings.selectedEditor') ||
    !editors.find((editor) => isEqual(editor, settings.get('appSettings.selectedEditor')))
  ) {
    settings.set('appSettings.selectedEditor', editors[0]);
  }
};

const updateShells = async () => {
  const shells = await getAvailableShells();
  settings.set('appSettings.shells', shells);
  if (
    !settings.get('appSettings.selectedShell') ||
    !shells.find((shell) => isEqual(shell, settings.get('appSettings.selectedShell')))
  ) {
    settings.set('appSettings.selectedShell', shells[0]);
  }
};

export const updateAppSettings = async () => {
  updateEditors();
  updateShells();
};
