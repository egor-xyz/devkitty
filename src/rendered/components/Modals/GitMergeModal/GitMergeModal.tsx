import { Button, Classes, Dialog, DialogBody, DialogFooter, Icon } from '@blueprintjs/core';
import { FC, useState } from 'react';

import { ModalProps } from 'types';
import { GitStatus } from 'types/project';
import { useGit } from 'rendered/hooks/useGit';

import { CurrentBranch, LightText, RepoInfo, MergeTo, StyledBranchSelect } from './GitMergeModal.styles';

export type GitMergeModalProps = {
  gitStatus: GitStatus;
  id: string;
  name: string;
};

export const GitMergeModal: FC<ModalProps & GitMergeModalProps> = (props) => {
  const { id, name, gitStatus, isOpen, onClose, darkMode } = props;

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
      title="Merge branch"
      onClose={onClose}
    >
      <DialogBody>
        <RepoInfo>
          <div>
            <LightText>{gitStatus?.organization ?? '[Local git]'}/</LightText>
            {name}
          </div>

          <div>
            <LightText>Branch: </LightText>
            <CurrentBranch
              as="span"
              title={gitStatus?.status?.current}
            >
              {gitStatus?.status?.current}
            </CurrentBranch>
          </div>
        </RepoInfo>

        <MergeTo>
          <span>merge to</span>

          <Icon icon="arrow-right" />

          <StyledBranchSelect
            fill
            currentBranch={target}
            gitStatus={gitStatus}
            onSelect={setTargetAndSave}
          />
        </MergeTo>
      </DialogBody>
      <DialogFooter
        actions={
          <Button
            icon="git-merge"
            intent="primary"
            loading={loading}
            text="Merge"
            onClick={merge}
          />
        }
      />
    </Dialog>
  );
};
