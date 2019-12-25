import { Dispatch } from 'react';
import simpleGit from 'simple-git/promise';
import { lstat, readdir } from 'fs-extra';

import { AppStoreActions, AppStoreState } from 'context';
import { showOpenFolderDialog } from 'utils/dialog';

export const addFolder = async (state: AppStoreState, dispatch: Dispatch<AppStoreActions>): Promise<boolean> => {
  const path = await showOpenFolderDialog();
  if (!path) return false;
  const projectsRootGit = simpleGit(path);
  if (!(await projectsRootGit.checkIsRepo())) return false;
  dispatch({ payload: [path], type: 'addProjectsSrc' });
  return true;
};

export const addFolders = async (state: AppStoreState, dispatch: Dispatch<AppStoreActions>): Promise<boolean> => {
  const path = await showOpenFolderDialog();
  if (!path) return false;

  // if folder is repo
  const stat = await lstat(path);
  if (!stat.isDirectory()) return false;
  const git = simpleGit(path);
  if (await git.checkIsRepo()) {
    dispatch({ payload: [path], type: 'addProjectsSrc' });
    return true;
  }

  const folders: string[] = await readdir(path);
  const list: string[] = [];
  for (const repo of folders) {
    const repoPath = path + '/' + repo;
    const stat = await lstat(repoPath);
    if (!stat.isDirectory()) continue;
    const git = simpleGit(repoPath);
    if (!(await git.checkIsRepo())) continue;
    list.push(repoPath);
  }
  dispatch({ payload: list, type: 'addProjectsSrc' });
  return true;
};