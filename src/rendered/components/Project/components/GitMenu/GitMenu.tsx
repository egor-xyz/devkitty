import { Menu, MenuDivider, MenuItem } from '@blueprintjs/core';
import { type FC } from 'react';
import { useModal } from 'rendered/hooks/useModal';
import { type GitStatus, type Project } from 'types/project';

type Props = {
  gitStatus: GitStatus;
  project: Project;
};

export const GitMenu: FC<Props> = ({ gitStatus, project }) => {
  const { openModal } = useModal();

  const openMerge = () => openModal({ name: 'git:merge', props: { gitStatus, id: project.id, name: project.name } });
  const openReset = () => openModal({ name: 'git:reset', props: { gitStatus, id: project.id, name: project.name } });

  return (
    <Menu>
      <MenuDivider title="Git actions" />

      <MenuItem
        icon="refresh"
        onClick={openReset}
        text="git reset"
      />

      <MenuItem
        icon={'git-merge'}
        onClick={openMerge}
        text="git merge"
      />
    </Menu>
  );
};
