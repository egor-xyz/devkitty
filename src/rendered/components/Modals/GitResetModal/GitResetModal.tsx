import { Button, Callout, Classes, Dialog, DialogFooter, Switch } from '@blueprintjs/core';
import { FC, useState } from 'react';

import { appToaster } from 'rendered/utils/appToaster';
import { ModalProps } from 'types';
import { GitStatus } from 'types/project';

import { StyledBranchSelect, StyledDialogBody } from './GitResetModal.styles';

export type GitResetModalProps = {
  gitStatus: GitStatus;
  id: string;
  name: string;
};

export const GitResetModal: FC<ModalProps & GitResetModalProps> = ({
  id,
  name,
  gitStatus,
  isOpen,
  onClose,
  darkMode
}) => {
  const [target, setTarget] = useState(gitStatus?.branchSummary?.current);
  const [forcePush, setForcePush] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectTarget = (branch: string) => {
    const target = branch.includes('origin/') ? branch.split('origin/')[1] : branch;
    setTarget(target);
  };

  const resetBranch = async () => {
    setLoading(true);
    const res = await window.bridge.git.reset(id, target, forcePush);
    if (!res.success) {
      (await appToaster).show({
        icon: 'info-sign',
        intent: 'warning',
        message: `${name} reset ${res.message}`,
        timeout: 0
      });
      setLoading(false);
      return;
    }
    onClose();
  };

  return (
    <Dialog
      className={darkMode && Classes.DARK}
      icon="reset"
      isOpen={isOpen}
      title={`Reset branch to origin/${target}`}
      onClose={onClose}
    >
      <StyledDialogBody>
        <StyledBranchSelect
          fill
          currentBranch={target}
          gitStatus={gitStatus}
          loading={loading}
          onSelect={selectTarget}
        />

        <Switch
          checked={forcePush}
          disabled={loading}
          label="Force push"
          onChange={() => setForcePush(!forcePush)}
        />

        <Callout intent={forcePush ? 'warning' : 'primary'}>
          This command cannot be reverted!!!.
          <br />
          All local{' '}
          {forcePush && (
            <>
              and <b>remote</b>
            </>
          )}{' '}
          changes will be <b>lost</b>.
        </Callout>
      </StyledDialogBody>
      <DialogFooter
        actions={
          <Button
            icon="reset"
            intent={forcePush ? 'warning' : 'primary'}
            loading={loading}
            text={
              <>
                RESET <b>{gitStatus?.branchSummary?.current}</b> branch to <b>origin/{target}</b>
              </>
            }
            onClick={resetBranch}
          />
        }
      />
    </Dialog>
  );
};
