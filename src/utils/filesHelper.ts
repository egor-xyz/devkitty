import path from 'path';

import { Dispatch } from 'react';
import findIndex from 'lodash/findIndex';
import { api } from 'electron-util';
import fs from 'fs-extra';

import { AppStoreActions, AppStoreState } from 'context';

export const deleteFolder = (
  repo: string | undefined,
  state: AppStoreState,
  dispatch: Dispatch<AppStoreActions>
): void => {
  const { projects } = state;
  const index = findIndex(projects, { repo });
  api.remote.shell.moveItemToTrash(projects[index].path);
  projects.splice(index, 1);
  dispatch({ payload: [...projects], type: 'setProjects' });
};

export const getNodeVersion = async (projectPath: string): Promise<string | undefined> => {
  let nodeVersion;
  try {
    nodeVersion = await fs.readFile(path.join(projectPath, '.nvmrc'), 'utf8');
  } catch { /**/ }
  if (!nodeVersion) return;
  return nodeVersion;
};