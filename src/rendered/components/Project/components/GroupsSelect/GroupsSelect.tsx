import { MenuDivider, MenuItem } from '@blueprintjs/core';
import { FC } from 'react';

import { useModal } from 'rendered/hooks/useModal';
import { useNewGroups } from 'rendered/hooks/useNewGroups';
import { useProjects } from 'rendered/hooks/useProjects';

type Props = {
  groupId: string;
  id: string;
};

export const GroupsSelect: FC<Props> = ({ groupId, id }) => {
  const { groups } = useNewGroups();
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
        text="Add group"
        onClick={addGroup}
      />

      {groupId && <MenuDivider />}

      {groupId && (
        <>
          <MenuItem
            icon="small-cross"
            intent="warning"
            key="blank"
            text={`Remove from ${name}`}
            onClick={() => addGroupId(id, undefined)}
          />
        </>
      )}

      {Boolean(groups.length) && <MenuDivider />}
      {groups.map(({ fullName, id: _groupId, icon }) => (
        <MenuItem
          disabled={_groupId === groupId}
          icon={icon}
          key={_groupId}
          text={fullName}
          onClick={() => addGroupId(id, _groupId)}
        />
      ))}
    </MenuItem>
  );
};
