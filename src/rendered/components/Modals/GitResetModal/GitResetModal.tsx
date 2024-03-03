import { Button, Classes, Dialog, DialogFooter, Switch } from '@blueprintjs/core';
import { FC, useState } from 'react';

import { appToaster } from 'rendered/utils/appToaster';
import { ModalProps } from 'types';
import { GitStatus } from 'types/project';

import { StyledBranchSelect, StyledDialogBody, Row, Options } from './GitResetModal.styles';

export type GitResetModalProps = {
  gitStatus: GitStatus;
  id: string;
  name: string;
};

enum storageKeys {
  origin = 'GitResetModal:origin-',
  remoteMode = 'GitResetModal:remoteMode-'
}

export const GitResetModal: FC<ModalProps & GitResetModalProps> = (props) => {
  const { id, name, gitStatus, isOpen, onClose, darkMode } = props;

  const all = gitStatus?.branchSummary.all;

  const defRemoteMode = Boolean(localStorage.getItem(`${storageKeys.remoteMode}${id}`));
  const savedOrigin = localStorage.getItem(`${storageKeys.origin}${id}`);
  const defOrigin =
    savedOrigin && (all.includes(savedOrigin) || all.includes(`remotes/origin/${savedOrigin}`))
      ? savedOrigin
      : gitStatus?.branchSummary?.current;

  const [remoteMode, setRemoteMode] = useState(defRemoteMode);
  const [forcePush, setForcePush] = useState(defRemoteMode);
  const [origin, setOrigin] = useState(defOrigin);
  const [target, setTarget] = useState(gitStatus?.branchSummary?.current);
  const [loading, setLoading] = useState(false);

  const toggleRemoteMode = () => {
    const remote = !remoteMode;
    setRemoteMode(remote);

    localStorage.setItem(`${storageKeys.remoteMode}${id}`, remote ? 'true' : '');

    if (remote) {
      setForcePush(false);
      setForcePush(true);
      return;
    }

    setForcePush(false);
  };

  const selectOrigin = (branch: string) => {
    const origin = branch.includes('origin/') ? branch.split('origin/')[1] : branch;
    setOrigin(origin);
    localStorage.setItem(`${storageKeys.origin}${id}`, origin);
  };

  const selectTarget = (branch: string) => {
    const target = branch.includes('origin/') ? branch.split('origin/')[1] : branch;
    setTarget(target);
  };

  const resetRemote = async () => {
    console.log('resetRemote');
  };

  const resetBranch = async () => {
    if (remoteMode) {
      resetRemote();
      return;
    }
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

  const actionText = remoteMode
    ? `Reset remote origin/${origin} branch to origin/${target}`
    : `Reset branch to ${target}`;

  return (
    <Dialog
      className={darkMode && Classes.DARK}
      icon="reset"
      isOpen={isOpen}
      title={actionText}
      onClose={onClose}
    >
      <StyledDialogBody>
        <Options>
          <Switch
            checked={remoteMode}
            disabled={loading}
            label="Remote mode"
            onChange={toggleRemoteMode}
          />

          <Switch
            checked={forcePush}
            disabled={loading || remoteMode}
            label="Force push"
            onChange={() => setForcePush(!forcePush)}
          />
        </Options>

        {remoteMode && (
          <Row>
            <div>Remote Branch</div>
            <StyledBranchSelect
              fill
              currentBranch={origin}
              gitStatus={gitStatus}
              loading={loading}
              onSelect={selectOrigin}
            />
          </Row>
        )}

        <Row>
          <span>Reset to</span>
          <StyledBranchSelect
            fill
            currentBranch={target}
            gitStatus={gitStatus}
            loading={loading}
            onSelect={selectTarget}
          />
        </Row>
      </StyledDialogBody>

      <DialogFooter
        actions={
          <Button
            icon="reset"
            intent={forcePush ? 'warning' : 'primary'}
            loading={loading}
            text={actionText}
            onClick={resetBranch}
          />
        }
      />
    </Dialog>
  );
};
