import { Alert, Classes } from '@blueprintjs/core';
import { type FC } from 'react';
import { useProjects } from 'rendered/hooks/useProjects';
import { type ModalProps } from 'types/Modal';

export type RemoveAlertProps = {
  id: string;
  name: string;
};

export const RemoveAlert: FC<ModalProps & RemoveAlertProps> = ({ darkMode, id, isOpen, name, onClose }) => {
  const { removeProject } = useProjects();

  const remove = () => {
    removeProject(id);
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
      Are you sure you want to remove the project <br />
      <b>{name}</b>?
    </Alert>
  );
};
