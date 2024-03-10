import { Button, Classes, Dialog, DialogBody, DialogFooter, InputGroup } from '@blueprintjs/core';
import { FC, useState } from 'react';

import { useNewGroups } from 'rendered/hooks/useNewGroups';
import { Group } from 'types/Group';
import { ModalProps } from 'types/Modal';

export type GroupModalProps = {
  groupId?: string;
  projectId: string;
};

export const GroupModal: FC<ModalProps & GroupModalProps> = ({ isOpen, onClose, darkMode, groupId }) => {
  const { groups } = useNewGroups();
  const [name, setName] = useState<Group['name']>('');

  const title = groupId ? 'Edit group' : 'Add group';
  const actionText = groupId ? 'Save' : 'Add';

  console.log(groups);

  return (
    <Dialog
      className={darkMode && Classes.DARK}
      icon="group-item"
      isOpen={isOpen}
      title={title}
      onClose={onClose}
    >
      <DialogBody>
        <InputGroup
          placeholder="group name..."
          value={name}
          onChange={({ target: { value } }) => {
            setName(value ?? '');
          }}
        />
      </DialogBody>
      <DialogFooter
        minimal
        actions={
          <Button
            intent="primary"
            text={actionText}
          />
        }
      />
    </Dialog>
  );
};
