import { MenuDivider, MenuItem } from '@blueprintjs/core';
import { FC } from 'react';

import { useGroups } from 'rendered/hooks/useGroups';
import { useProjects } from 'rendered/hooks/useProjects';

type Props = {
  group: string;
  id: string;
};

export const OldFashionGroupsSelect: FC<Props> = ({ group, id }) => {
  const { groupsWithAliases } = useGroups();
  const { addGroup } = useProjects();

  return (
    <>
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
    </>
  );
};
