import { resolve } from 'path';

import { Dispatch } from 'react';
import open from 'open';

import { Project } from 'models';
import { AppStoreActions, AppStoreState } from 'context';
import { ModalsStore } from 'modals/context';

const simpleGit = require('simple-git/promise');

export const mergeBranches = async (
  project: Project,
  from: string | undefined,
  to: string | undefined,
  state: AppStoreState,
  dispatch: Dispatch<AppStoreActions>,
  openModal: ModalsStore['openModal']
): Promise<boolean> => {
  if (!from || !to) return false;

  try {
    const git = await simpleGit(project.path);

    dispatch({ payload: `Checkout ${to}`, type: 'setAppStatus' });
    await git.checkout(to);

    dispatch({ payload: `Pull ${to}`, type: 'setAppStatus' });
    await git.pull();

    dispatch({ payload: `Merging from ${from}`, type: 'setAppStatus' });
    await git.merge([from]);

    dispatch({ payload: `Pushing ${to}`, type: 'setAppStatus' });
    await git.push();

    dispatch({ payload: `Checkout ${from}`, type: 'setAppStatus' });
    await git.checkout(project.branch.current);

    dispatch({ type: 'setAppStatus' });
    return true;
  }
  catch (error) {
    const files: string[] = (error?.git?.merges || [])
      .map((file: string) => resolve(project.path + '/' + file))
    ;

    if (files.length) {
      dispatch({ payload: 'Please solve merge conflicts in IDE', type: 'setAppStatus' });
      state.IDE && open(project.path, {
        app: {
          arguments: [...files],
          name: state.IDE
        },
        wait: true
      });
      return false;
    }

    openModal({ data: error, name: 'console' });
    return false;
  }
};