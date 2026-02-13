import { Menu, MenuDivider, MenuItem } from '@blueprintjs/core';
import { type FC } from 'react';
import { useModal } from 'renderer/hooks/useModal';
import { type GitStatus } from 'types/project';

import { GroupsSelect } from '../GroupsSelect';

type Props = {
  getStatus: () => void;
  gitStatus: GitStatus;
  groupId?: string;
  id: string;
  name: string;
  pull: () => void;
  removeProject: () => void;
};

export const ProjectMenu: FC<Props> = ({ getStatus, gitStatus, groupId, id, name, pull, removeProject }) => {
  const { openModal } = useModal();

  return (
    <Menu>
      <MenuItem
        icon="refresh"
        onClick={getStatus}
        text="Refresh"
      />

      <MenuItem
        icon="git-pull"
        onClick={pull}
        text="Pull"
      />

      <MenuItem
        icon="git-merge"
        onClick={() => openModal({ name: 'git:merge', props: { gitStatus, id, name } })}
        text="Merge"
      />

      <MenuItem
        icon="reset"
        intent="warning"
        onClick={() => openModal({ name: 'git:reset', props: { gitStatus, id, name } })}
        text="Reset branch"
      />

      <MenuDivider />

      <GroupsSelect
        groupId={groupId}
        id={id}
      />

      <MenuDivider title="Danger zone" />

      <MenuItem
        icon="trash"
        intent="danger"
        onClick={removeProject}
        text="Remove"
      />
    </Menu>
  );
};
