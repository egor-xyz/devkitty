import { Dispatch } from 'react';
import { lstat } from 'fs-extra';
import { BranchSummary, StatusResult } from 'simple-git/promise';
import { find, findIndex } from 'lodash';
import orderBy from 'lodash/orderBy';
import gitUrlParse from 'git-url-parse';
import { api } from 'electron-util';

import { AppStoreActions, AppStoreState } from 'context';
import { Project, ProjectWithError } from 'models';
import { getNodeVersion } from 'utils/filesHelper';
import { BranchesObj } from 'models/Branch';

const simpleGit = require('simple-git/promise');

type ScanFolders = (options: {
  dispatch: Dispatch<AppStoreActions>;
  groupId?: string; // scan only this group
  repoName?: string; // scan one repo only
  state: AppStoreState;
  useLoader?: boolean; // don't use global loader
}) => Promise<void>;

export const scanFolders: ScanFolders = async ({ state, dispatch, repoName, useLoader = true, groupId }) => {
  const { projects, projectsSrc, online } = state;

  if (!online) return;

  const project = find(projects, { repo: repoName });
  if (repoName && !project) return;

  const folders: string[] = repoName
    ? [project!.path]
    : projectsSrc
    ;

  let updates = 0;
  let errors: ProjectWithError[] = [];

  const res: (Project | undefined)[] = await Promise.all(
    folders.map(async (path): Promise<Project | undefined> => {
      const repo = path.replace(/^.*[\\/]/, '');

      const project = find(state.projects, { repo });

      // skip scanAll if General refresh - group collapsed
      if (!groupId && state.collapsedGroups.has(state.projectsSettings[repo]?.groupId ?? '')) {
        if (project) return project;
      }

      if (groupId && groupId !== '0' && state.projectsSettings[repo]?.groupId !== groupId) {
        return project;
      }

      // For projects without group
      if (groupId === '0' && !!state.projectsSettings[repo]?.groupId) {
        return project;
      }

      try {
        const stat = await lstat(path);
        if (!stat.isDirectory()) return;

        useLoader && dispatch({ payload: { active: true, name: repo }, type: 'setLoading' });

        const git = simpleGit(path);
        if (!(await git.checkIsRepo())) {
          useLoader && dispatch({ payload: { name: repo }, type: 'setLoading' });
          return;
        }

        await git.fetch();

        const branchSummary: BranchSummary = await git.branch();

        const branchesObj: BranchesObj = {};
        branchSummary.all.forEach(name => {
          if (name.includes('remotes/')) {
            const alias = name
              .replace('remotes/', '')
              .replace('origin/', '')
              ;
            if (branchesObj[alias]) {
              branchesObj[alias].remote = name;
              return;
            }
            branchesObj[alias] = {
              current: false,
              local: false,
              name: alias,
              remote: name
            };
            return;
          }

          branchesObj[name] = {
            current: branchSummary.current === name,
            local: true,
            name,
            remote: name === 'master' ? 'master' : undefined,
          };
        });
        const branches = orderBy<BranchesObj>(branchesObj, ['current', 'local', 'remote', 'name'], ['desc', 'desc', 'asc']);

        const status: StatusResult = await git.status();

        let gitData;
        try {
          let url = await git.remote(['get-url', 'origin']);
          gitData = gitUrlParse(url);
        } catch {/**/ }

        useLoader && dispatch({ payload: { name: repo }, type: 'setLoading' });

        // Get node version
        const node = await getNodeVersion(path);

        if (status.behind) updates++;

        return {
          branch: branchSummary,
          branches: [...branches],
          git: gitData,
          node,
          path,
          repo,
          status
        };
      } catch (e) {
        errors.push({
          message: e.message,
          path,
          repo
        });
        // dispatch({ payload: path, type: 'removeProjectsSrc' });
        useLoader && dispatch({ payload: { name: repo }, type: 'setLoading' });
        return;
      }
    })
  );

  if (errors.length) {
    dispatch({ payload: errors, type: 'setProjectsWithError' });
  }

  if (!repoName) api.remote.app.setBadgeCount(updates);

  let filteredProjects = res.filter(project => !!project) as Project[];
  const projectsWithUrl = orderBy(filteredProjects.filter(p => p.git), ['name']);
  const projectsNoUrl = orderBy(filteredProjects.filter(p => !p.git), ['name']);
  filteredProjects = [...projectsWithUrl, ...projectsNoUrl];

  if (repoName) {
    const index = findIndex(projects, { repo: repoName });
    projects.splice(index, 1, ...filteredProjects);
    dispatch({ payload: projects, type: 'setProjects' });
  } else {
    dispatch({ payload: filteredProjects, type: 'setProjects' });
  }
};