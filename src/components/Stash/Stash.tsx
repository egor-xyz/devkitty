import { ChangeEvent, FC, useState } from 'react';
import { Button, InputGroup, Tag } from '@blueprintjs/core';

import { useAppStore, useAppStoreDispatch } from 'context';
import { Project } from 'models';
import { stashChanges } from 'utils';
import { useModalsStore } from 'modals/context';

import css from './Stash.module.scss';

export const Stash:FC = () => {
  const state = useAppStore();
  const dispatch = useAppStoreDispatch();

  const { data, closeModal } = useModalsStore();
  const [message, setMessage] = useState('');
  const project: Project = data?.project;
  if (!project) return null;
  const { path, branch: { current }, status: { modified } } = project;
  return (<div className={css.root}>
    <div>
      <b>Repo Status</b>
      <Tag
        intent={modified.length ? 'success': 'danger'}
        interactive={true}
      >
        {modified.length
          ? `${modified.length} file${modified.length > 1 ? 's' : ''} modified`
          : 'not modified'
        }
      </Tag>
    </div>
    <div><b>Git Root</b> {path}</div>
    <div><b>Current Branch</b> {current}</div>

    <InputGroup
      disabled={!modified.length}
      leftIcon={'comment'}
      placeholder={'message (optional)'}
      value={message}
      onChange={(e: ChangeEvent<HTMLInputElement>) => setMessage(e.target.value ?? '')}
    />

    <div className={css.actions}>
      <Button
        disabled={!modified.length}
        intent={'primary'}
        text={'Stash'}
        onClick={() => stashChanges(project, message, state, dispatch, closeModal)}
      />
    </div>
  </div>);
};