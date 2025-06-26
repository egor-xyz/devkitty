import { ipcMain } from 'electron';
import { type LaunchEditor } from 'types/foundEditor';
import { type LaunchShell } from 'types/foundShell';

import { launchExternalEditor } from '../libs/integrations/editrosLaunch';
import { launch } from '../libs/integrations/shellsLaunch';

ipcMain.handle('launch:editor', async (e, launchEditor: LaunchEditor) => {
  launchExternalEditor(launchEditor.fullPath, launchEditor.editor);
});

ipcMain.handle('launch:shell', async (e, launchShell: LaunchShell) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  launch(launchShell.shell as any, launchShell.fullPath);
});
