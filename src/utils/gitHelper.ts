import { Dispatch } from 'react';

import { Project } from 'models';
import { AppStoreActions, AppStoreState } from 'context';
import { scanFolders } from 'utils/scanFolders';
import { ModalsStore } from 'modals/context';

const simpleGit = require('simple-git/promise');

export const pullFolder = async (project: Project, dispatch: Dispatch<AppStoreActions>, state: AppStoreState): Promise<boolean> => {
  const { repo, path } = project;
  dispatch({ payload: { active: true, name: repo }, type: 'setLoading' });
  try {
    const git = simpleGit(path);
    await git.pull();
    dispatch({ payload: { active: false, name: repo }, type: 'setLoading' });
    return true;
  } catch (e) {
    dispatch({ payload: { active: false, name: repo }, type: 'setLoading' });
    return false;
  }
};

export const pushFolder = async (project: Project, state: AppStoreState, dispatch: Dispatch<AppStoreActions>): Promise<void> => {
  const { repo, path, branch: { current } } = project;
  dispatch({ payload: { active: true, name: repo }, type: 'setLoading' });
  const git = simpleGit(path);
  await git.push('origin', current);
  await scanFolders({ dispatch, repoName: project.repo, state });
  dispatch({ payload: { name: repo }, type: 'setLoading' });
};

export const fetchFolder = async (project: Project, dispatch: Dispatch<AppStoreActions>): Promise<void> => {
  const { repo, path } = project;
  dispatch({ payload: { active: true, name: repo }, type: 'setLoading' });
  const git = simpleGit(path);
  await git.fetch();
  dispatch({ payload: { name: repo }, type: 'setLoading' });
};

export const stashChanges = async (
  project: Project,
  message: string,
  state: AppStoreState,
  dispatch: Dispatch<AppStoreActions>,
  closeModal: ModalsStore['closeModal']
): Promise<boolean> => {
  const { path, repo } = project;
  const git = simpleGit(path);
  const settings = [];
  if (message) settings.push(`-m ${message}`);
  try {
    await git.stash(settings);
    closeModal();
    scanFolders({ dispatch, repoName: repo, state });
  } catch {
    return false;
  }
  return true;
};

export const stashChangesList = async (project: Project): Promise<any[]> => {
  const { path } = project;
  const git = simpleGit(path);
  try {
    const res = await git.stashList();
    return res.all;
  } catch {
    return [];
  }
};

export const stashDrop = async (id: number, project: Project): Promise<boolean> => {
  const { path } = project;
  const git = simpleGit(path);
  try {
    await git.stash(['drop', `${id}`]);
    return true;
  } catch {
    return false;
  }
};

export const stashClear = async (project: Project): Promise<boolean> => {
  const { path } = project;
  const git = simpleGit(path);
  try {
    await git.stash(['clear']);
    return true;
  } catch {
    return false;
  }
};

export const stashApply = async (id: number, project: Project, pop: boolean): Promise<boolean> => {
  const { path } = project;
  const git = simpleGit(path);
  try {
    await git.stash([pop ? 'pop' : 'apply', `${id}`]);
    return true;
  } catch {
    return false;
  }
};

export const checkoutBranch = async (project: Project, branchName: string): Promise<boolean> => {
  const { path, status } = project;
  const modified = !!status.modified.length;

  const name = branchName
    .replace('remotes/origin/', '')
    .replace('origin/', '');

  const git = simpleGit(path);

  try {
    if (modified) await git.stash(['-m GBM:checkout']);
  } catch {
    return false;
  }

  let result = true;
  try {
    await git.checkout(name);
  } catch {
    result = false;
  }
  finally {
    try {
      if (modified) await git.stash(['pop']);
    } catch {
      result = false;
    }
  }
  return result;
};

export const createNewBranch = async (
  project: Project,
  branchName: string,
  state: AppStoreState,
  dispatch: Dispatch<AppStoreActions>
): Promise<void> => {
  const git = simpleGit(project.path);
  await git.checkoutLocalBranch(branchName);
  await scanFolders({
    dispatch,
    repoName: project.repo,
    state,
  });
};

export const deleteBranch = async (
  branch: string, project: Project, state: AppStoreState, dispatch: Dispatch<AppStoreActions>
): Promise<void> => {
  if (branch === 'master') return;
  const git = simpleGit(project.path);
  if (project.branch.current === branch) await git.checkout('master');
  await git.deleteLocalBranch(branch);
  await scanFolders({ dispatch, repoName: project.repo, state });
};