import { Alert, Classes } from '@blueprintjs/core';
import { type FC } from 'react';
import { useGroups } from 'rendered/hooks/useGroups';
import { type Group } from 'types/Group';
import { type ModalProps } from 'types/Modal';

export type RemoveGroupAlertProps = {
  group: Group;
};

export const RemoveGroupAlert: FC<ModalProps & RemoveGroupAlertProps> = ({ darkMode, group, isOpen, onClose }) => {
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
