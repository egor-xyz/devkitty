import { FC } from 'react';
import { Drawer } from '@blueprintjs/core';

import { Project } from 'models';
import { getCurrentBranch } from 'utils';
import { InfoItem } from 'components';

import { Root } from './ProjectCardInfo.styles';

interface Props {
  isOpen: boolean;
  onClose(): void;
  project: Project;
}

export const ProjectCardInfo: FC<Props> = ({ isOpen, project, onClose }) => {
  const { path, git, branches, status } = project;
  if (!git) return null;
  const { name, remote } = getCurrentBranch(project);
  const { ahead, behind, modified } = status;
  return (
    <Drawer
      canOutsideClickClose={true}
      hasBackdrop={false}
      icon={'git-branch'}
      isOpen={isOpen}
      size='500px'
      title={project.repo}
      onClose={onClose}
    >
      <Root>
        <InfoItem
          icon={'git-branch'}
          showCollapse={false}
          title={'General'}
          values={{
            'branch': name,
            'commits ahead': ahead,
            'commits behind': behind,
            'modified': modified.length ? modified.join('\n') : undefined,
            path,
            remote,
          }}
        />

        <InfoItem
          icon={'git-commit'}
          title={`Branches ${branches.length ? '(' + branches.length + ')' : ''}`}
          values={branches.map(b => b.name)}
        />
      </Root>
    </Drawer>
  );
};