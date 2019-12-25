import { FC } from 'react';
import { Collapse, Tag } from '@blueprintjs/core';
import clsx from 'clsx';

import { Project } from 'models';

interface Props {
  isOpen: boolean;
  loading: boolean;
  project: Project;
}

export const ExtraBranchInfo:FC<Props> = ({ isOpen, loading, project: { git, node } }) => (
  <Collapse
    isOpen={isOpen}
    keepChildrenMounted={true}
  >
    <div className='info'>
      {!!git?.organization && (
        <Tag
          className={clsx({ 'bp3-skeleton': loading })}
          icon={'git-repo'}
          interactive={true}
          title='Git owner'
        >{git.organization}</Tag>
      )}
      {node && (
        <Tag
          className={clsx({ 'bp3-skeleton': loading })}
          icon={'cube'}
          interactive={true}
          title='Node version'
        >{node}</Tag>
      )}
    </div>
  </Collapse>
);