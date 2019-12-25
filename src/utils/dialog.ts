import { remote } from 'electron';

export const showOpenFolderDialog = async (): Promise<string | undefined> => {
  const { filePaths } = await remote.dialog.showOpenDialog(
    remote.getCurrentWindow(),
    { properties: ['openDirectory'] }
  );
  if (!filePaths.length) return;
  return filePaths[0];
};