import { Dispatch } from 'react';
import { api } from 'electron-util';
import jp from 'jquery-param';

import { AppStoreActions, AppStoreState } from 'context';
import { Project } from 'models';
import { ModalsStore } from 'modals/context';

type CreatePullRequest = (
  params: {
    dispatch: Dispatch<AppStoreActions>;
    from: string | undefined;
    project: Project;
    state: AppStoreState;
    to: string | undefined;
  },
  closeModal: ModalsStore['closeModal']
) => void;

export const openGitHosting = ({ git }: Project): void => {
  if (!git) return;
  api.shell.openExternal(`https://${git.resource}/${git.full_name}`);
};

export const createPullRequest: CreatePullRequest = ({ from, to, project: { git }, dispatch }, closeModal) => {
  if (!git || !from || !to) return;
  switch (git.resource) {
    case 'github.com': {
      const url = `https://${git.resource}/${git.full_name}/compare/${to}...${from}`;
      api.shell.openExternal(url);
      break;
    }
    case 'bitbucket.org': {
      const url = `https://${git.resource}/${git.full_name}/pull-requests/new?source=${from}&destination=${to}`;
      api.shell.openExternal(url);
      break;
    }
    case 'gitlab.com': {
      const query = jp({
        merge_request: {
          source_branch: from,
          target_branch: to
        }
      });
      const url = `https://${git.resource}/${git.full_name}/-/merge_requests/new?${query}`;
      api.shell.openExternal(url);
      break;
    }
  }
  closeModal();
};