import { Button, Classes, DialogBody, InputGroup } from '@blueprintjs/core';
import { FC, useState } from 'react';
import { v4 } from 'uuid';

import { useNewGroups } from 'rendered/hooks/useNewGroups';
import { Group } from 'types/Group';
import { ModalProps } from 'types/Modal';
import { useProjects } from 'rendered/hooks/useProjects';
import { appToaster } from 'rendered/utils/appToaster';

import { Actions, StyledDialog } from './GroupModal.styles';

export type GroupModalProps = {
  groupId?: string;
  projectId: string;
};

export const GroupModal: FC<ModalProps & GroupModalProps> = ({ isOpen, onClose, darkMode, groupId, projectId }) => {
  const { groups, addGroup } = useNewGroups();
  const [name, setName] = useState<Group['name']>('');
  const [error, setError] = useState<string>();
  const { addGroupId } = useProjects();

  const title = groupId ? 'Edit group' : 'Add group';
  const actionText = groupId ? 'Save' : 'Add';

  const handleSave = async () => {
    setError(undefined);

    if (!name || groups.some((group) => group.name.toLowerCase() === name.toLowerCase())) {
      setError('Group name already exists');
      return;
    }

    const newGroup: Group = {
      fullName: name,
      id: v4(),
      name
    };

    addGroup(newGroup);
    addGroupId(projectId, newGroup.id);

    (await appToaster).show({
      intent: 'success',
      message: `Group "${name}" added`
    });

    onClose();
  };

  console.log(groups);

  return (
    <StyledDialog
      className={darkMode && Classes.DARK}
      icon="group-item"
      isOpen={isOpen}
      title={title}
      onClose={onClose}
    >
      <DialogBody>
        <InputGroup
          autoFocus
          intent={error ? 'danger' : 'none'}
          placeholder="group name..."
          value={name}
          onChange={({ target: { value } }) => setName(value ?? '')}
        />

        <Actions>
          <Button
            intent="primary"
            text={actionText}
            onClick={handleSave}
          />
        </Actions>
      </DialogBody>
    </StyledDialog>
  );
};
