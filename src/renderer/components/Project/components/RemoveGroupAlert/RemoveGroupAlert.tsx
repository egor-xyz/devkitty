import { Alert, Classes } from '@blueprintjs/core';
import { type FC } from 'react';
import { useGroups } from 'renderer/hooks/useGroups';
import { useProjects } from 'renderer/hooks/useProjects';
import { type Group } from 'types/Group';
import { type ModalProps } from 'types/Modal';

export type RemoveGroupAlertProps = {
  group: Group;
};

export const RemoveGroupAlert: FC<ModalProps & RemoveGroupAlertProps> = ({ darkMode, group, isOpen, onClose }) => {
  const { deleteGroup } = useGroups();
  const { addGroupId, projects } = useProjects();

  const remove = async () => {
    const groupProjects = projects.filter((p) => p.groupId === group.id);
    for (const project of groupProjects) {
      await addGroupId(project.id, undefined);
    }
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
