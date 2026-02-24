import { Alert, Classes } from '@blueprintjs/core';
import { type FC } from 'react';
import { type ModalProps } from 'types/Modal';

export type HideRunAlertProps = {
  onConfirm: (runId: number) => void;
  runId: number;
  runName: string;
};

export const HideRunAlert: FC<HideRunAlertProps & ModalProps> = ({
  darkMode,
  isOpen,
  onClose,
  onConfirm,
  runId,
  runName
}) => {
  const confirm = () => {
    onConfirm(runId);
    onClose();
  };

  return (
    <Alert
      cancelButtonText="Cancel"
      className={darkMode && Classes.DARK}
      confirmButtonText="Hide"
      icon="eye-off"
      intent="warning"
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={confirm}
    >
      Hide <b>{runName}</b>?

      <p className="mt-3 text-xs opacity-70">
        Hidden runs will reappear when you restart the app.
      </p>
    </Alert>
  );
};
