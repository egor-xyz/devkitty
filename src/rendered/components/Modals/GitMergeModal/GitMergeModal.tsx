import { Button, Callout, Classes, Dialog, DialogBody, DialogFooter, Divider, Icon, Switch } from '@blueprintjs/core';
import { FC, useState } from 'react';

import { ModalProps } from 'types';
import { GitStatus } from 'types/project';
import { useGit } from 'rendered/hooks/useGit';

import { CurrentBranch, LightText, RepoInfo, MergeTo, StyledBranchSelect, Force } from './GitMergeModal.styles';

export type GitMergeModalProps = {
  gitStatus: GitStatus;
  id: string;
  name: string;
};

export const GitMergeModal: FC<ModalProps & GitMergeModalProps> = ({
  id,
  name,
  gitStatus,
  isOpen,
  onClose,
  darkMode
}) => {
  const savedTarget: string = localStorage.getItem(`git:mergeTo-${id}`);
  const all = gitStatus?.branchSummary.all;
  const defTarget = savedTarget && all.includes(savedTarget) ? savedTarget : all[0];

  const [reset, setReset] = useState(false);
  const [target, setTarget] = useState(defTarget);
  const [loading, setLoading] = useState(false);
  const { mergeTo } = useGit();

  const setTargetAndSave = (name: string) => {
    setTarget(name);
    localStorage.setItem(`git:mergeTo-${id}`, name);
  };

  const merge = async () => {
    setLoading(true);
    if (reset) {
      console.log('reset');
    } else {
      const res = await mergeTo(id, gitStatus?.branchSummary?.current, target);
      if (res) {
        onClose();
      }
    }
    setLoading(false);
  };

  return (
    <Dialog
      className={darkMode && Classes.DARK}
      icon={reset ? 'reset' : 'git-merge'}
      isOpen={isOpen}
      title={reset ? 'Reset branch' : 'Merge branch'}
      onClose={onClose}
    >
      <DialogBody>
        <RepoInfo>
          <div>
            <LightText>{gitStatus?.organization ?? '[Local git]'}/</LightText>
            {name}
          </div>
          {!reset && (
            <div>
              <LightText>Branch: </LightText>
              <CurrentBranch
                as="span"
                title={gitStatus?.status?.current}
              >
                {gitStatus?.status?.current}
              </CurrentBranch>
            </div>
          )}
        </RepoInfo>

        <MergeTo>
          <span>{reset ? 'reset' : 'merge to'}</span>

          <Icon icon="arrow-right" />

          <StyledBranchSelect
            fill
            currentBranch={target}
            gitStatus={gitStatus}
            onSelect={setTargetAndSave}
          />
        </MergeTo>

        {reset && (
          <RepoInfo>
            <div>
              <LightText>to branch </LightText>
              <CurrentBranch
                as="span"
                title={gitStatus?.status?.current}
              >
                {gitStatus?.status?.current}
              </CurrentBranch>
            </div>
          </RepoInfo>
        )}

        <Divider />

        <Force>
          <Switch
            checked={reset}
            label="Reset and force push"
            onChange={() => setReset(!reset)}
          />

          {reset && (
            <Callout intent="warning">
              This command cannot be reverted!!!.
              <br />
              All changes will be <b>lost</b>.
            </Callout>
          )}
        </Force>
      </DialogBody>
      <DialogFooter
        actions={
          <Button
            icon={reset ? 'reset' : 'git-merge'}
            intent={reset ? 'warning' : 'primary'}
            loading={loading}
            text={reset ? 'Reset' : 'Merge'}
            onClick={merge}
          />
        }
      />
    </Dialog>
  );
};
