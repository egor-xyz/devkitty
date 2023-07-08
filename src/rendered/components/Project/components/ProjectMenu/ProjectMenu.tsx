import { Menu, MenuDivider, MenuItem } from '@blueprintjs/core';
import { FC } from 'react';

import { useGroups } from 'rendered/hooks/useGroups';
import { useModal } from 'rendered/hooks/useModal';
import { useProjects } from 'rendered/hooks/useProjects';
import { GitStatus } from 'types/project';

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
  const { groupsWithAliases } = useGroups();
  const { addGroup } = useProjects();

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
        text="Reset to ..."
        onClick={() => openModal({ name: 'git:reset', props: { gitStatus, id, name } })}
      />

      <MenuDivider />

      <MenuItem
        icon="unresolve"
        text="Group"
      >
        {group && (
          <>
            <MenuItem
              icon="small-cross"
              intent="warning"
              key="blank"
              text={`Remove from ${group}`}
              onClick={() => addGroup(id, undefined)}
            />

            <MenuDivider />
          </>
        )}

        {groupsWithAliases.map(({ fullName, id: groupID, icon }) => (
          <MenuItem
            disabled={groupID === group}
            icon={icon}
            key={groupID}
            text={fullName}
            onClick={() => addGroup(id, groupID)}
          />
        ))}
      </MenuItem>

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
