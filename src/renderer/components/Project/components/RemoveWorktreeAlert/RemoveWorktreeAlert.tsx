import { Alert, Classes } from '@blueprintjs/core';
import { type FC } from 'react';
import { appToaster } from 'renderer/utils/appToaster';
import { type ModalProps } from 'types/Modal';

export type RemoveWorktreeAlertProps = {
  branch: string;
  id: string;
  onSuccess?: () => void;
  worktreePath: string;
};

export const RemoveWorktreeAlert: FC<ModalProps & RemoveWorktreeAlertProps> = ({
  branch,
  darkMode,
  id,
  isOpen,
  onClose,
  onSuccess,
  worktreePath
}) => {
  const remove = async () => {
    const res = await window.bridge.worktree.remove(id, worktreePath);

    if (res.success) {
      (await appToaster).show({ icon: 'trash', intent: 'success', message: res.message });
      onSuccess?.();
    } else {
      (await appToaster).show({ icon: 'info-sign', intent: 'warning', message: res.message, timeout: 0 });
    }

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
      Are you sure you want to remove the worktree for branch <br />
      <b>{branch}</b>?
    </Alert>
  );
};
