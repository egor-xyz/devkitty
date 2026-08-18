import { Alert, Classes, Switch } from '@blueprintjs/core';
import { type FC, useState } from 'react';
import { appToaster } from 'renderer/utils/appToaster';
import { type ModalProps } from 'types/Modal';

export type RemoveWorktreeAlertProps = {
  branch: string;
  id: string;
  // The card marks its row as being removed the moment the request goes out,
  // and clears that again if git refuses.
  onFailure?: () => void;
  onStart?: () => void;
  onSuccess?: () => void;
  worktreePath: string;
};

export const RemoveWorktreeAlert: FC<ModalProps & RemoveWorktreeAlertProps> = ({
  branch,
  darkMode,
  id,
  isOpen,
  onClose,
  onFailure,
  onStart,
  onSuccess,
  worktreePath
}) => {
  const [force, setForce] = useState(false);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    onStart?.();

    const res = await window.bridge.worktree.remove(id, worktreePath, force);
    setBusy(false);

    if (res.success) {
      (await appToaster).show({ icon: 'trash', intent: 'success', message: res.message });
      onSuccess?.();
    } else {
      (await appToaster).show({ icon: 'info-sign', intent: 'warning', message: res.message, timeout: 0 });
      onFailure?.();
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
      loading={busy}
      onClose={onClose}
      onConfirm={remove}
    >
      Are you sure you want to remove the worktree for branch <br />
      <b>{branch}</b>?

      <Switch
        checked={force}
        className="mt-4 mb-0"
        label="Force delete"
        onChange={() => setForce(!force)}
      />

    </Alert>
  );
};
