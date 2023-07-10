import { ipcMain } from 'electron';

import { LaunchEditor } from 'types/foundEditor';
import { LaunchShell } from 'types/foundShell';

import { launch } from '../libs/integrations/shellsLaunch';
import { launchExternalEditor } from '../libs/integrations/editrosLaunch';

ipcMain.handle('launch:editor', async (e, launchEditor: LaunchEditor) => {
  launchExternalEditor(launchEditor.fullPath, launchEditor.editor);
});

ipcMain.handle('launch:shell', async (e, launchShell: LaunchShell) => {
  launch(launchShell.shell as any, launchShell.fullPath);
});
