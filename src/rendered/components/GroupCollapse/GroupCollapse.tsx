import { Classes, Icon } from '@blueprintjs/core';
import type { FC } from 'react';

import { Group } from 'types/Group';
import { Projects } from 'types/project';
import { useModal } from 'rendered/hooks/useModal';

import { Project } from '../Project';
import { GroupBody, GroupTitle, Root } from './GroupCollapse.styles';

type Props = {
  collapsed: boolean;
  group: Group;
  onClick: () => void;
  projects: Projects;
};

export const GroupCollapse: FC<Props> = ({ group, collapsed, onClick, projects }) => {
  const { openModal } = useModal();

  const removeGroup = () => {
    openModal({
      name: 'remove:group',
      props: { group }
    });
  };

  const isEmpty = !projects.length;

  return (
    <Root key={group.id}>
      <GroupTitle onClick={() => !isEmpty && onClick()}>
        <div className={Classes.ALIGN_LEFT}>
          <Icon icon={group.icon} />{' '}
          <span>
            {group.fullName} ({projects.length})
          </span>
        </div>

        <div className={Classes.ALIGN_RIGHT}>
          {isEmpty && (
            <Icon
              icon="trash"
              size={14}
              onClick={removeGroup}
            />
          )}

          {!isEmpty && (
            <Icon
              icon={collapsed ? 'minimize' : 'maximize'}
              intent={collapsed ? 'warning' : 'none'}
              size={14}
            />
          )}
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
};
