import { Menu, MenuDivider, MenuItem } from '@blueprintjs/core';
import { FC } from 'react';

import { useModal } from 'rendered/hooks/useModal';
import { GitStatus, Project } from 'types/project';

type Props = {
  gitStatus: GitStatus;
  project: Project;
};

export const GitMenu: FC<Props> = ({ project, gitStatus }) => {
  const { openModal } = useModal();

  const openMerge = () => openModal({ name: 'git:merge', props: { gitStatus, id: project.id, name: project.name } });
  const openReset = () => openModal({ name: 'git:reset', props: { gitStatus, id: project.id, name: project.name } });

  return (
    <Menu>
      <MenuDivider title="Git actions" />

      <MenuItem
        icon="refresh"
        text="git reset"
        onClick={openReset}
      />

      <MenuItem
        icon={'git-merge'}
        text="git merge"
        onClick={openMerge}
      />
    </Menu>
  );
};
