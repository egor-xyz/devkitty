import { Button, Classes, Dialog, DialogBody, DialogFooter, Icon } from '@blueprintjs/core';
import { type FC, useState } from 'react';
import { BranchSelect } from 'rendered/components/BranchSelect';
import { useGit } from 'rendered/hooks/useGit';
import { type ModalProps } from 'types/Modal';
import { type GitStatus } from 'types/project';

export type GitMergeModalProps = {
  gitStatus: GitStatus;
  id: string;
  name: string;
};

export const GitMergeModal: FC<GitMergeModalProps & ModalProps> = (props) => {
  const { darkMode, gitStatus, id, isOpen, name, onClose } = props;

  const savedTarget: string = localStorage.getItem(`git:mergeTo-${id}`);
  const all = gitStatus?.branchSummary.all;
  const defTarget = savedTarget && all.includes(savedTarget) ? savedTarget : all[0];

  const [target, setTarget] = useState(defTarget);
  const [loading, setLoading] = useState(false);
  const { mergeTo } = useGit();

  const setTargetAndSave = (name: string) => {
    setTarget(name);
    localStorage.setItem(`git:mergeTo-${id}`, name);
  };

  const merge = async () => {
    setLoading(true);

    const res = await mergeTo(id, gitStatus?.branchSummary?.current, target);
    if (res) {
      onClose();
    }

    setLoading(false);
  };

  return (
    <Dialog
      className={darkMode && Classes.DARK}
      icon="git-merge"
      isOpen={isOpen}
      onClose={onClose}
      title="Merge branch"
    >
      <DialogBody>
        <div className="flex flex-col items-start mb-2.5 text-sm font-semibold gap-1.5">
          <div>
            <span className="font-light">{gitStatus?.organization ?? '[Local git]'}/</span>
            {name}
          </div>

          <div>
            <span className="font-light">Branch: </span>

            <span
              className="overflow-hidden text-ellipsis select-none"
              title={gitStatus?.status?.current}
            >
              {gitStatus?.status?.current}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between my-5 gap-2.5">
          <span>merge to</span>
          <Icon icon="arrow-right" />

          <BranchSelect
            className="flex-2"
            currentBranch={target}
            fill
            gitStatus={gitStatus}
            onSelect={setTargetAndSave}
          />
        </div>
      </DialogBody>

      <DialogFooter
        actions={
          <Button
            icon="git-merge"
            intent="primary"
            loading={loading}
            onClick={merge}
            text="Merge"
          />
        }
      />
    </Dialog>
  );
};
