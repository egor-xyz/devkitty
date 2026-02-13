import { Button, Classes, Dialog, DialogBody, DialogFooter, InputGroup, Switch } from '@blueprintjs/core';
import { type FC, useState } from 'react';
import { BranchSelect } from 'renderer/components/BranchSelect';
import { appToaster } from 'renderer/utils/appToaster';
import { type ModalProps } from 'types/Modal';
import { type GitStatus } from 'types/project';

export type WorktreeAddModalProps = {
  gitStatus: GitStatus;
  id: string;
  name: string;
  onSuccess?: () => void;
};

export const WorktreeAddModal: FC<ModalProps & WorktreeAddModalProps> = (props) => {
  const { darkMode, gitStatus, id, isOpen, name, onClose, onSuccess } = props;

  const worktreeBranches = (gitStatus?.worktrees ?? []).map((w) => w.branch);

  const allBranches = gitStatus?.branchSummary?.all ?? [];
  const available = allBranches.filter(
    (b) => !worktreeBranches.includes(b) && !worktreeBranches.includes(b.replace('remotes/origin/', ''))
  );
  const defaultBranch = available[0] ?? allBranches[0];

  const [branch, setBranch] = useState(defaultBranch);
  const [createNew, setCreateNew] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!branch) return;
    if (createNew && !newBranchName.trim()) return;

    setLoading(true);

    const cleanBranch = branch.replace(/(remotes\/origin\/|origin\/)/, '');
    const res = await window.bridge.worktree.add(
      id,
      name,
      cleanBranch,
      createNew ? newBranchName.trim() : undefined
    );
    setLoading(false);

    if (res.success) {
      (await appToaster).show({
        icon: 'git-new-branch',
        intent: 'success',
        message: res.message
      });
      onSuccess?.();
      onClose();
    } else if (res.message !== 'Cancelled') {
      (await appToaster).show({
        icon: 'info-sign',
        intent: 'warning',
        message: res.message,
        timeout: 0
      });
    }
  };

  const isValid = branch && (!createNew || newBranchName.trim());

  return (
    <Dialog
      className={darkMode && Classes.DARK}
      icon="git-new-branch"
      isOpen={isOpen}
      onClose={onClose}
      title="Add worktree"
    >
      <DialogBody>
        <div className="flex flex-col items-start mb-2.5 text-sm font-semibold gap-1.5">
          <div>
            <span className="font-light">{gitStatus?.organization ?? '[Local git]'}/</span>
            {name}
          </div>

          <div>
            <span className="font-light">Current branch: </span>
            <span>{gitStatus?.branchSummary?.current}</span>
          </div>
        </div>

        <Switch
          checked={createNew}
          className="mt-2.5"
          label="Create new branch"
          onChange={() => setCreateNew(!createNew)}
        />

        <div className="flex items-center justify-between my-5 gap-2.5">
          <span>{createNew ? 'From' : 'Branch'}</span>

          <BranchSelect
            className="flex-2"
            currentBranch={branch}
            excludeBranches={worktreeBranches}
            fill
            gitStatus={gitStatus}
            onSelect={setBranch}
          />
        </div>

        {createNew && (
          <div className="flex items-center justify-between gap-2.5">
            <span className="whitespace-nowrap">New branch</span>

            <InputGroup
              className="flex-2"
              fill
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="feature/my-branch"
              value={newBranchName}
            />
          </div>
        )}
      </DialogBody>

      <DialogFooter
        actions={
          <Button
            disabled={!isValid}
            icon="git-new-branch"
            intent="primary"
            loading={loading}
            onClick={create}
            text="Create worktree"
          />
        }
      />
    </Dialog>
  );
};
