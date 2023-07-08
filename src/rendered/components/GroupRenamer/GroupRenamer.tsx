import { Button, InputGroup, MenuItem } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import { useState } from 'react';

import { useGroups } from 'rendered/hooks/useGroups';
import { Group } from 'types';

import { Actions, Block, GroupForm, Row } from './GroupRenamer.styles';

export const GroupRenamer = () => {
  const { groups, groupAliases, setGroupAlias, removeGroupAlias: remooveGroupAlias } = useGroups();
  const [selectedGroup, setSelectedGroup] = useState<Group>(groupAliases[0] ?? groups[0]);

  const onItemSelect = (group: Group) => {
    const groupAlias = groupAliases.find(({ id }) => id === group.id) ?? group;
    setSelectedGroup(groupAlias);
  };

  const resetGroupAlias = () => {
    setSelectedGroup(groups.find(({ id }) => id === selectedGroup.id) ?? groups[0]);
    remooveGroupAlias(selectedGroup.id);
  };

  return (
    <>
      <Row>
        <Select<Group>
          filterable={false}
          itemRenderer={(group, { handleClick, modifiers }) => (
            <MenuItem
              active={modifiers.active}
              key={group.id}
              text={group.name}
              onClick={handleClick}
            />
          )}
          items={groups}
          popoverProps={{ position: 'bottom-left' }}
          onItemSelect={onItemSelect}
        >
          <Button
            rightIcon="chevron-down"
            text={selectedGroup.id}
          />
        </Select>
      </Row>

      <GroupForm>
        <Block>
          <div>Group Name</div>
          <InputGroup
            fill={false}
            placeholder="Full name"
            value={selectedGroup.fullName}
            onChange={({ target: { value } }) => {
              value && setSelectedGroup({ ...selectedGroup, fullName: value });
            }}
          />
        </Block>

        <Block>
          <div>Group Button Name</div>
          <InputGroup
            fill={false}
            placeholder="Name"
            value={selectedGroup.name}
            onChange={({ target: { value } }) => {
              value && setSelectedGroup({ ...selectedGroup, name: value });
            }}
          />
        </Block>
      </GroupForm>

      <Actions>
        <Button
          icon="reset"
          text="Reset"
          onClick={resetGroupAlias}
        />

        <Button
          icon="floppy-disk"
          intent="primary"
          text="Save"
          onClick={() => setGroupAlias(selectedGroup)}
        />
      </Actions>
    </>
  );
};
