import { Collapse, Spinner } from '@blueprintjs/core';
import clsx from 'clsx';
import { AnimateSharedLayout } from 'framer-motion';
import { groupBy, isEmpty, orderBy, some, sortBy } from 'lodash';
import { Dispatch, FC, useMemo } from 'react';

import { msg, ProjectCard } from 'components';
import { AppStoreActions, AppStoreState, useAppStore, useAppStoreDispatch } from 'context';
import { useModalsStore, WelcomeModal } from 'modals';
import { Project } from 'models';
import { checkoutBranch, fetchFolder, pullFolder, scanFolders } from 'utils';

import { EmptyState, GroupTitle } from './components';
import css from './ProjectsPage.module.scss';

const FireworksCanvas = require('fireworks-canvas');
let stopFire: any;

export const ProjectsPage: FC = () => {
  const state = useAppStore();
  const dispatch = useAppStoreDispatch();

  const { name } = useModalsStore();

  const {
    bottomBar,
    groupFilter,
    groupId: selectedGroupId = '0',
    projects,
    projectsSettings,
    projectsSrc,
    snow,
    collapsedGroups,
    groups,
    loading,
    projectsWithError
  } = state;

  const updateGitProject = async (repo?: string) => {
    await scanFolders({ dispatch, repoName: repo, state });
  };

  const checkoutGitBranch = async (project: Project, branch: string): Promise<void> => {
    dispatch({ payload: { active: true, name: project.repo }, type: 'setLoading' });
    const done = await checkoutBranch(project, branch);
    if (!done) {
      msg.show({
        icon: 'git-branch',
        intent: 'danger',
        message: 'Fail to checkout branch'
      });
      dispatch({ payload: { name: project.repo }, type: 'setLoading' });
      return;
    }

    await updateGitProject(project.repo);

    msg.show({
      icon: 'git-branch',
      intent: 'primary',
      message: `${project.repo} => ${branch.split('/').pop()}`,
    });

    dispatch({ payload: { name: project.repo }, type: 'setLoading' });
  };

  const fetchGitFolder = async (project: Project, dispatch: Dispatch<AppStoreActions>): Promise<void> => {
    await fetchFolder(project, dispatch);
    updateGitProject(project.repo);
  };

  const pullGitFolder = async (project: Project, dispatch: Dispatch<AppStoreActions>, state: AppStoreState): Promise<void> => {
    if (!state.online) {
      msg.show({
        icon: 'globe-network',
        intent: 'danger',
        message: 'No internet connection',
      });
      return;
    }

    const success = await pullFolder(project, dispatch, state);
    if (!success) {
      msg.show({
        icon: 'git-pull',
        intent: 'danger',
        message: `${project.repo} pull error. Please check in IDE`,
      });
      return;
    }

    await updateGitProject(project.repo);
    msg.show({
      icon: 'git-pull',
      intent: 'primary',
      message: `${project.repo} pulled successful`,
    });
  };

  const fire = () => {
    if (stopFire) {
      stopFire();
      return;
    }

    if (!snow) return;

    const container = document.getElementsByClassName(css.fire)[0];
    const options = {
      explosionChance: 0.08,    // max # of rockets to spawn
      explosionMaxHeight: 0.9,  // milliseconds to check if new rockets should spawn
      explosionMinHeight: 0.2,  // number of particles to spawn when rocket explodes (+0-10)
      maxRockets: 3,            // percentage. min height at which rockets can explode
      numParticles: 100,        // percentage. max height before a particle is exploded
      rocketSpawnInterval: 150  // chance in each tick the rocket will explode
    };
    const fireworks = new FireworksCanvas(container, options);
    stopFire = fireworks.start();
  };

  const resetAndRefresh = () => {
    if (selectedGroupId !== '0') {
      dispatch({ payload: '0', type: 'setGroupId' });
    }

    setTimeout(() => { scanFolders({ dispatch, state }) });
  };

  // render

  let sortedProjects = [...projects];

  if (selectedGroupId !== '0') {
    sortedProjects = sortedProjects.filter(({ repo }) => {
      const { groupId = 0 } = projectsSettings[repo] ?? {};
      return groupId === selectedGroupId;
    });
  }

  if (groupFilter) {
    const sortedRepos = orderBy(Object.values(projectsSettings), ['groupId']).map(({ repo }) => repo);
    sortedProjects = sortBy(sortedProjects, i => {
      return sortedRepos.indexOf(i.repo) === -1 ? sortedProjects.length : sortedRepos.indexOf(i.repo);
    });
  }

  let sortedGroupsProjects = groupFilter
    ? Object.values(groupBy(sortedProjects, ({ repo }) => projectsSettings[repo]?.groupId
      ? projectsSettings[repo]?.groupId
      : 0
    ))
    : sortedProjects.length ? [[...sortedProjects]] : []
    ;

  // move other to the end
  if (sortedGroupsProjects.length) sortedGroupsProjects = [...sortedGroupsProjects.slice(1), sortedGroupsProjects[0]];

  sortedGroupsProjects = sortedGroupsProjects.map(g => orderBy(g, ['repo']));

  !!projectsWithError.length && console.log(projectsWithError);

  return useMemo(() => {
    return (
      <div
        className={clsx(css.root, { [css.noFooter]: !bottomBar })}
        onClick={fire}
      >
        {!isEmpty(loading) && !sortedProjects.length && (
          <div className={css.loader}>
            <Spinner intent={'primary'} />
          </div>
        )}

        {isEmpty(loading) && !sortedProjects.length && (
          <EmptyState resetAndRefresh={resetAndRefresh} />
        )}

        <AnimateSharedLayout>
          {sortedGroupsProjects.map((sProjects, key) => {
            const id = projectsSettings[sProjects[0].repo]?.groupId ?? '0';
            const updates = some(sProjects, ({ status: { behind } }) => behind > 0);
            return (
              <div
                className={clsx({ [css.group]: groupFilter })}
                key={key}
              >
                <GroupTitle
                  id={id}
                  isOpen={
                    sortedGroupsProjects.length < 2
                    || !collapsedGroups.has(id!)
                    || !groupFilter
                    || selectedGroupId !== '0'
                  }
                  showNotification={updates}
                  sortedGroupsProjects={sortedGroupsProjects}
                />

                <Collapse
                  isOpen={
                    sortedGroupsProjects.length < 2
                    || !collapsedGroups.has(id!)
                    || !groupFilter
                    || selectedGroupId !== '0'
                  }
                  keepChildrenMounted={false}
                >
                  <div>
                    {sProjects.map((project, key) => (
                      <ProjectCard
                        checkoutBranch={checkoutGitBranch}
                        fetchFolder={fetchGitFolder}
                        key={key}
                        project={project}
                        pullFolder={pullGitFolder}
                      />
                    ))}
                  </div>
                </Collapse>
              </div>
            );
          })}
        </AnimateSharedLayout>

        <WelcomeModal open={isEmpty(loading) && !projectsSrc.length} />

        <div className={css.fire} />
      </div>
    );
  }, [ // eslint-disable-line
    bottomBar,
    collapsedGroups,
    groupFilter,
    groups,
    loading,
    name,
    projects,
    projectsSettings,
    projectsSrc,
    selectedGroupId,
    snow,
    sortedGroupsProjects,
    projectsWithError
  ]);
};
