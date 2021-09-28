import open from 'open';
import { is } from 'electron-util';
import { shell } from 'electron';

import { Project } from 'models';

const child_process = require('child_process');

export const openTerminal = (name: string, project: Project): void => {
  open(project.path, { app: { name }, wait: false });
};

export const openInFinder = (project: Project): void => {
  shell.openPath(project.path);
};

export const openExternalURL = (url?: string): void => {
  if (!url) return;
  shell.openExternal(url);
};

export const openInIDE = async (project: Project, IDE?: string): Promise<void> => {
  if (!IDE) return;
  try {
    switch (true) {
      case is.macos:
        open(project.path, { app: { name: IDE } });
        break;
      case is.windows:
        child_process.exec(`start ${IDE} "${project.path}"`);
        break;
      default:
        return;
    }
  }
  catch { /**/ }
};