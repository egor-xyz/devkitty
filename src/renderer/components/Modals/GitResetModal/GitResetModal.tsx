import { Button, Classes, Dialog, DialogBody, DialogFooter, type Intent, Switch } from '@blueprintjs/core';
import { type FC, useState } from 'react';
import { BranchSelect } from 'renderer/components/BranchSelect';
import { appToaster } from 'renderer/utils/appToaster';
import { type ModalProps } from 'types/Modal';
import { type GitStatus } from 'types/project';

enum storageKeys {
  origin = 'GitResetModal:origin-',
  remoteMode = 'GitResetModal:remoteMode-'
}

export type GitResetModalProps = {
  gitStatus: GitStatus;
  id: string;
  name: string;
};

export const GitResetModal: FC<GitResetModalProps & ModalProps> = (props) => {
  const { darkMode, gitStatus, id, isOpen, name, onClose } = props;

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
    const res = await window.bridge.gitAPI.reset(id, origin, target);
    if (!res.success) {
      (await appToaster).show({
        icon: 'info-sign',
        intent: 'warning',
        message: `Remote reset ${res.message}`
      });
      setLoading(false);
      return;
    }

    (await appToaster).show({
      icon: 'info-sign',
      intent: 'success',
      message: res.message
    });

    onClose();
  };

  const resetBranch = async () => {
    setLoading(true);

    if (remoteMode) {
      resetRemote();
      return;
    }

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

  const actionText = remoteMode ? `Reset remote ${origin} branch to ${target}` : `Reset branch to ${target}`;

  const actionIntent: Intent = remoteMode ? 'danger' : forcePush ? 'warning' : 'primary';

  return (
    <Dialog
      className={darkMode && Classes.DARK}
      icon="reset"
      isOpen={isOpen}
      onClose={onClose}
      title={actionText}
    >
      <DialogBody className="select-none flex flex-col gap-2.5">
        <div className="flex gap-[30px] items-center">
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
        </div>

        {remoteMode && (
          <div className="flex justify-between gap-[30px] items-center">
            <div>Remote Branch</div>

            <BranchSelect
              className="flex-3 max-w-[300px]"
              currentBranch={origin}
              disabled={loading}
              fill
              gitStatus={gitStatus}
              onSelect={selectOrigin}
            />
          </div>
        )}

        <div className="flex justify-between gap-[30px] items-center">
          <span>Reset to</span>

          <BranchSelect
            className="flex-3 max-w-[300px]"
            currentBranch={target}
            disabled={loading}
            fill
            gitStatus={gitStatus}
            onSelect={selectTarget}
          />
        </div>
      </DialogBody>

      <DialogFooter
        actions={
          <Button
            icon="reset"
            intent={actionIntent}
            loading={loading}
            onClick={resetBranch}
            text={actionText}
          />
        }
      />
    </Dialog>
  );
};
