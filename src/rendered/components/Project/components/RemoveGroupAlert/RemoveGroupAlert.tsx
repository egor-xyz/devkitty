import { Alert, Classes } from '@blueprintjs/core';
import { FC } from 'react';

import { useGroups } from 'rendered/hooks/useGroups';
import { Group } from 'types/Group';
import { ModalProps } from 'types/Modal';

export type RemoveGroupAlertProps = {
  group: Group;
};

export const RemoveGroupAlert: FC<RemoveGroupAlertProps & ModalProps> = ({ isOpen, group, darkMode, onClose }) => {
  const { deleteGroup } = useGroups();

  const remove = () => {
    deleteGroup(group.id);
    onClose();
  };

  return (
    <Alert
      cancelButtonText="Cancel"
      className={darkMode && Classes.DARK}
      confirmButtonText="Remove"
      icon="trash"
      intent="danger"
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={remove}
    >
      Are you sure you want to delete the group <br />
      <b>{group.name}</b>?
    </Alert>
  );
};
