import { Classes, Icon } from '@blueprintjs/core';
import type { FC } from 'react';

import { Group } from 'types';
import { Projects } from 'types/project';

import { Project } from '../Project';
import { GroupBody, GroupTitle, Root } from './GroupCollapse.styles';

type Props = {
  collapsed: boolean;
  group: Group;
  onClick: () => void;
  projects: Projects;
};

export const GroupCollapse: FC<Props> = ({ group, collapsed, onClick, projects }) => (
  <Root key={group.id}>
    <GroupTitle onClick={onClick}>
      <div className={Classes.ALIGN_LEFT}>
        <Icon icon={group.icon} />{' '}
        <span>
          {group.fullName} ({projects.length})
        </span>
      </div>

      <div className={Classes.ALIGN_RIGHT}>
        <Icon
          icon={collapsed ? 'minimize' : 'maximize'}
          intent={collapsed ? 'warning' : 'none'}
          size={14}
        />
      </div>
    </GroupTitle>
    <GroupBody
      $collapsed={collapsed}
      $length={projects.length}
    >
      {!collapsed &&
        projects.map((project) => (
          <Project
            key={project.id}
            project={project}
          />
        ))}
    </GroupBody>
  </Root>
);
