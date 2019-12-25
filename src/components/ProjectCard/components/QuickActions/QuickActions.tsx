import { FC, useMemo, useState } from 'react';
import { Button, ButtonGroup, Tooltip } from '@blueprintjs/core';
import clsx from 'clsx';
import { api } from 'electron-util';

import { getIdeName, openInIDE } from 'utils';
import { useAppStore } from 'context';
import { Project } from 'models';
import { useModalsStore } from 'modals/context';

interface Props {
  loading: boolean;
  project: Project;
}

export const QuickActions:FC<Props> = ({ loading, project, project: { branch } }) => {
  const [copyIcon, setCopyIcon] = useState<'clipboard' | 'saved'>('clipboard');
  const { openModal } = useModalsStore();
  const { IDE } = useAppStore();

  const nameIDE = getIdeName(IDE);

  return useMemo(() => (
    <ButtonGroup className='buttonGroup'>
      <Button
        alignText={'center'}
        className={clsx({ 'bp3-skeleton': loading })}
        icon={copyIcon}
        title={'Copy current branch'}
        onClick={() => {
          api.clipboard.writeText(branch.current);
          setCopyIcon('saved');
          setTimeout(() => {
            setCopyIcon('clipboard');
          }, 2000);
        }}
      />

      {IDE && (
        <Button
          alignText={'center'}
          className={clsx({ 'bp3-skeleton': loading })}
          icon={'share'}
          title={`Open in ${nameIDE}`}
          onClick={() => openInIDE(project, IDE)}
        />
      )}

      <Tooltip
        content={'Stash'}
        position={'bottom'}
      >
        <Button
          alignText={'center'}
          className={clsx({ 'bp3-skeleton': loading })}
          icon={'projects'}
          onClick={() => openModal({
            data: { project },
            name: 'stash',
          })}
        />
      </Tooltip>

      <Tooltip
        content={'git merge'}
        disabled={!!project.status.modified.length}
        position={'bottom'}
      >
        <Button
          alignText={'center'}
          className={clsx({ 'bp3-skeleton': loading })}
          disabled={!!project.status.modified.length}
          icon={'git-merge'}
          onClick={() => openModal({
            data: { project },
            name: 'merge',
          })}
        />
      </Tooltip>
    </ButtonGroup>
    // eslint-disable-next-line
  ), [IDE, copyIcon, loading, project]);
};