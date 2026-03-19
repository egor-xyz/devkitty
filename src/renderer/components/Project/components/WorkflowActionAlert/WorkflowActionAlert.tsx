import { Alert, Classes } from '@blueprintjs/core';
import { type IconName } from '@blueprintjs/icons';
import { type FC, useState } from 'react';
import { type ModalProps } from 'types/Modal';

export type WorkflowAction = 'cancel' | 'rerun' | 'rerun-failed';

export type WorkflowActionAlertProps = {
  action: WorkflowAction;
  projectId: string;
  runId: number;
  runName: string;
};

const config: Record<WorkflowAction, { buttonText: string; icon: IconName; intent: 'danger' | 'primary' | 'warning'; message: (name: string) => string }> = {
  cancel: {
    buttonText: 'Cancel',
    icon: 'stop',
    intent: 'danger',
    message: (name) => `Cancel workflow run "${name}"?`
  },
  rerun: {
    buttonText: 'Re-run all',
    icon: 'repeat',
    intent: 'primary',
    message: (name) => `Re-run all jobs in "${name}"?`
  },
  'rerun-failed': {
    buttonText: 'Re-run failed',
    icon: 'warning-sign',
    intent: 'warning',
    message: (name) => `Re-run failed jobs in "${name}"?`
  }
};

export const WorkflowActionAlert: FC<ModalProps & WorkflowActionAlertProps> = ({
  action,
  darkMode,
  isOpen,
  onClose,
  projectId,
  runId,
  runName
}) => {
  const [loading, setLoading] = useState(false);
  const { buttonText, icon, intent, message } = config[action];

  const confirm = async () => {
    setLoading(true);
    try {
      if (action === 'cancel') {
        await window.bridge.gitAPI.cancelRun(projectId, runId);
      } else if (action === 'rerun') {
        await window.bridge.gitAPI.rerunWorkflow(projectId, runId);
      } else if (action === 'rerun-failed') {
        await window.bridge.gitAPI.rerunFailedJobs(projectId, runId);
      }
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <Alert
      cancelButtonText="Cancel"
      className={darkMode && Classes.DARK}
      confirmButtonText={buttonText}
      icon={icon}
      intent={intent}
      isOpen={isOpen}
      loading={loading}
      onClose={onClose}
      onConfirm={confirm}
    >
      {message(runName)}
    </Alert>
  );
};
