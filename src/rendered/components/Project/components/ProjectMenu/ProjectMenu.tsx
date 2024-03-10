import { Menu, MenuDivider, MenuItem } from '@blueprintjs/core';
import { FC } from 'react';

import { useAppSettings } from 'rendered/hooks/useAppSettings';
import { useModal } from 'rendered/hooks/useModal';
import { GitStatus } from 'types/project';

import { OldFashionGroupsSelect } from '../OldFashionGroupsSelect/OldFashionGroupsSelect';

type Props = {
  getStatus: () => void;
  gitStatus: GitStatus;
  group?: string;
  id: string;
  name: string;
  pull: () => void;
  removeProject: () => void;
};

export const ProjectMenu: FC<Props> = ({ getStatus, name, id, gitStatus, removeProject, pull, group }) => {
  const { openModal } = useModal();

  const { oldFashionGroups } = useAppSettings();

  return (
    <Menu>
      <MenuItem
        icon="refresh"
        text="Refresh"
        onClick={getStatus}
      />
      <MenuItem
        icon="git-pull"
        text="Pull"
        onClick={pull}
      />
      <MenuItem
        icon="git-merge"
        text="Merge"
        onClick={() => openModal({ name: 'git:merge', props: { gitStatus, id, name } })}
      />
      <MenuItem
        icon="reset"
        intent="warning"
        text="Reset branch"
        onClick={() => openModal({ name: 'git:reset', props: { gitStatus, id, name } })}
      />

      {oldFashionGroups && (
        <OldFashionGroupsSelect
          group={group}
          id={id}
        />
      )}

      <MenuDivider title="Danger zone" />

      <MenuItem
        icon="trash"
        intent="danger"
        text="Remove"
        onClick={removeProject}
      />
    </Menu>
  );
};
