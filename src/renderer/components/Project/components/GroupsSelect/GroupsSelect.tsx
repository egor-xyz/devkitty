import { MenuDivider, MenuItem } from '@blueprintjs/core';
import { type FC } from 'react';
import { useGroups } from 'renderer/hooks/useGroups';
import { useModal } from 'renderer/hooks/useModal';
import { useProjects } from 'renderer/hooks/useProjects';

type Props = {
  groupId: string;
  id: string;
};

export const GroupsSelect: FC<Props> = ({ groupId, id }) => {
  const { groups } = useGroups();
  const { addGroupId } = useProjects();
  const { openModal } = useModal();

  const addGroup = () => openModal({ name: 'group', props: { projectId: id } });

  const { name } = groups.find(({ id: _groupId }) => _groupId === groupId) ?? {};

  return (
    <MenuItem
      icon="unresolve"
      text="Group"
    >
      <MenuItem
        icon="plus"
        onClick={addGroup}
        text="Add group"
      />

      {groupId && <MenuDivider />}

      {groupId && (
        <MenuItem
          icon="small-cross"
          intent="warning"
          key="blank"
          onClick={() => addGroupId(id, undefined)}
          text={`Remove from ${name}`}
        />
      )}

      {Boolean(groups.length) && <MenuDivider />}

      {groups.map(({ fullName, icon, id: _groupId }) => (
        <MenuItem
          disabled={_groupId === groupId}
          icon={icon}
          key={_groupId}
          onClick={() => addGroupId(id, _groupId)}
          text={fullName}
        />
      ))}
    </MenuItem>
  );
};
