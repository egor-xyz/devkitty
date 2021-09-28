import { ipcRenderer } from 'electron';

export const showOpenFolderDialog = async (): Promise<string | undefined> => new Promise<string | undefined>((resolve) => {
  ipcRenderer.invoke('showOpenFolderDialog').then((data) => resolve(data));
});
