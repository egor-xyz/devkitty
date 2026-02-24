import { Alert, Classes } from '@blueprintjs/core';
import { type FC } from 'react';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { type ModalProps } from 'types/Modal';

export type IgnoreWorkflowAlertProps = {
  workflowName: string;
  workflowPath: string;
};

export const IgnoreWorkflowAlert: FC<IgnoreWorkflowAlertProps & ModalProps> = ({
  darkMode,
  isOpen,
  onClose,
  workflowName,
  workflowPath
}) => {
  const { gitHubActions, set } = useAppSettings();
  const { ignoredWorkflows = [] } = gitHubActions;

  const confirm = () => {
    if (!ignoredWorkflows.includes(workflowPath)) {
      set({ gitHubActions: { ...gitHubActions, ignoredWorkflows: [...ignoredWorkflows, workflowPath] } });
    }
    onClose();
  };

  return (
    <Alert
      cancelButtonText="Cancel"
      className={darkMode && Classes.DARK}
      confirmButtonText="Ignore"
      icon="disable"
      intent="warning"
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={confirm}
    >
      Ignore all runs from <b>{workflowName}</b> workflow?
      <br />
      <span className="text-xs opacity-60">{workflowPath}</span>

      <p className="mt-3 text-xs opacity-70">
        You can undo this in Settings &rarr; GitHub.
      </p>
    </Alert>
  );
};
