import { Menu, MenuItem } from '@blueprintjs/core';
import { FC } from 'react';

import { useModal } from 'rendered/hooks/useModal';
import { GitStatus, Project } from 'types/project';

type Props = {
  gitStatus: GitStatus;
  project: Project;
};

export const GitMenu: FC<Props> = ({ project, gitStatus }) => {
  const { openModal } = useModal();

  const openMerge = () => {
    openModal({ name: 'git:merge', props: { gitStatus, id: project.id, name: project.name } });
  };

  return (
    <Menu>
      <MenuItem
        icon={'git-merge'}
        text="git merge"
        onClick={openMerge}
      />
    </Menu>
  );
};
