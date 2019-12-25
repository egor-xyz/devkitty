import { createElement, Dispatch } from 'react';
import { ContextMenu, Menu, MenuDivider, MenuItem } from '@blueprintjs/core';
import { darkMode, is } from 'electron-util';
import { find } from 'lodash';

import { AppStoreActions, AppStoreState } from 'context';
import { defGroupsIds, Project } from 'models';
import { getIdeName, openGitHosting, openInFinder, openInIDE, openTerminal } from 'utils';
import { ModalsStore } from 'modals/context';

export const onContextMenu = (
  e: any,
  project: Project,
  state: AppStoreState,
  dispatch: Dispatch<AppStoreActions>,
  openModal: ModalsStore['openModal']
) => {
  const { projectInfo, IDE, shell, groups, projectsSettings } = state;
  const { repo, git } = project;

  const macOs = is.macos;

  const nameIDE = getIdeName(IDE);
  const projectSettings = projectsSettings[repo] ?? { repo };

  const group = find(groups, { id: projectSettings?.groupId });

  const menu = createElement(
    Menu,
    {},
    <MenuItem
      disabled={!!project.status.modified.length}
      icon={'git-merge'}
      text='Merge'
      onClick={() => openModal({
        data: { project },
        name: 'merge'
      })}
    />,
    <MenuItem
      icon={'git-pull'}
      text='Pull Request'
      onClick={() => openModal({
        data: repo,
        name: 'pullRequest'
      })}
    />,
    <MenuItem
      icon='info-sign'
      text={`${projectInfo ? 'Hide' : 'Show'} info`}
      onClick={() => dispatch({ payload: 'projectInfo', type: 'toggle' })}
    />,
    <MenuDivider title='Open in ...' />,
    !!git && (
      <MenuItem
        icon={'git-repo'}
        text={git.resource}
        onClick={() => openGitHosting(project)}
      />
    ),
    <MenuItem
      disabled={!IDE}
      icon={'code'}
      text={nameIDE}
      onClick={() => openInIDE(project, IDE)}
    />,
    <MenuItem
      icon={'folder-open'}
      text={`${macOs ? 'Finder' : 'File Explorer'}`}
      onClick={() => openInFinder(project)}
    />,
    shell && (
      <MenuItem
        icon={'console'}
        text={`Open in ${shell}`}
        onClick={() => openTerminal(shell, project)}
      />
    ),
    (groups.length > 2 || group) && <MenuDivider title='Groups' />,
    groups.length > 2 && (
      <MenuItem
        icon={'bookmark'}
        text={'Add to'}
      >
        {groups.map(({ id, icon, name }) => {
          if (defGroupsIds.includes(id)) return null;
          return (
            <MenuItem
              icon={icon ?? 'bookmark'}
              key={id}
              text={name}
              onClick={() => dispatch({
                payload: {
                  ...projectSettings,
                  groupId: id
                },
                type: 'setProjectSettings'
              })}
            />
          );
        })}
      </MenuItem>
    ),
    group && (
      <MenuItem
        icon={'minus'}
        text={'Remove'}
        onClick={() => dispatch({
          payload: {
            ...projectSettings,
            groupId: undefined
          },
          type: 'setProjectSettings'
        })}
      />
    ),
    <MenuDivider />,
    <MenuItem
      icon={'trash'}
      intent={'danger'}
      text={'Remove repo'}
      onClick={() => dispatch({ payload: project.path, type: 'removeProjectsSrc' })}
    />,
  );

  ContextMenu.show(menu, { left: e.clientX, top: e.clientY }, () => {}, darkMode.isEnabled);
};