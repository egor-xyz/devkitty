import { FC, useEffect, useState } from 'react';
import clsx from 'clsx';
import { Alert, Button, Checkbox, Tag, Tooltip } from '@blueprintjs/core';

import { Project } from 'models';
import { scanFolders, stashApply, stashChangesList, stashClear, stashDrop } from 'utils';
import { useModalsStore } from 'modals/context';
import { useAppStore, useAppStoreDispatch } from 'context';

import css from './UnStash.module.scss';

export const UnStash:FC = () => {
  const { data, closeModal } = useModalsStore();
  const state = useAppStore();
  const dispatch = useAppStoreDispatch();

  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [popStash, setPopStash] = useState(false);
  const [selected, setSelected] = useState<number>();
  const [clearAlert, setClearAlert] = useState(false);

  const getList = async () => {
    const project: Project = data?.project;
    const list = await stashChangesList(project);
    setList(list);
    setSelected(undefined);
    setLoading(false);
  };

  const drop = async () => {
    const project: Project = data?.project;
    if (!project || selected === undefined) return;

    setLoading(true);

    const res = await stashDrop(selected, project);
    setLoading(false);
    if (!res) return;
    getList();
  };

  const clear = async () => {
    const project: Project = data?.project;
    if (!project) return;

    setLoading(true);

    const res = await stashClear(project);
    if (!res) {
      setLoading(false);
      return;
    }

    scanFolders({ dispatch, repoName: project.repo, state });
    closeModal();
  };

  const applyStash = async () => {
    const project: Project = data?.project;
    if (!project || selected === undefined) return;

    setLoading(true);

    const res = await stashApply(selected, project, popStash);
    if (!res) {
      setLoading(false);
      return;
    }

    scanFolders({ dispatch, repoName: project.repo, state });
    closeModal();
  };

  useEffect(() => {
    getList();
  }, []); // eslint-disable-line

  const project: Project = data?.project;
  if (!project) return null;
  const { path, branch: { current }, status: { modified } } = project;

  return (<div className={css.root}>
    <div>
      <b>Repo Status</b>
      <Tag
        intent={!modified.length ? 'success': 'danger'}
        interactive={true}
      >
        {modified.length
          ? `${modified.length} file${modified.length > 1 ? 's' : ''} modified`
          : 'not modified'
        }
      </Tag>
    </div>
    <div className={clsx(css.section, { 'bp3-skeleton': loading })}>
      <b>Git Root</b> {path}
    </div>
    <div className={clsx(css.section, { 'bp3-skeleton': loading })}>
      <b>Current Branch</b> {current}
    </div>
    <div className={css.section}>
      <b className={clsx({ 'bp3-skeleton': loading })}>Stashes</b>
      <div className={css.listWrap} >
        <div className={clsx(css.list, { 'bp3-skeleton': loading })}>
          {list.map(({ message }, id) => (
            <div
              className={clsx(css.item, selected === id && css.selected)}
              key={id}
              onClick={() => setSelected(selected === id ? undefined : id)}
            >
              stash@{id}: {message}
            </div>
          ))}
        </div>
        <div className={css.listActions}>
          <Tooltip
            className={clsx(css.btn, { 'bp3-skeleton': loading })}
            content={'Delete selected stash'}
            hoverOpenDelay={700}
            position={'bottom'}
          >
            {/* eslint-disable-next-line */}
            <Button
              text={'Drop'}
              onClick={drop}
            />
          </Tooltip>

          <Tooltip
            className={clsx(css.btn, { 'bp3-skeleton': loading })}
            content={'Delete all stashes in the repository'}
            hoverOpenDelay={700}
            position={'bottom'}
          >
            {/* eslint-disable-next-line */}
            <Button
              className={clsx(css.btn, { 'bp3-skeleton': loading })}
              intent={'danger'}
              text={'Clear'}
              onClick={() => setClearAlert(true)}
            />
          </Tooltip>
        </div>
      </div>
    </div>

    <Tooltip
      content={'If selected the stash is dropped after it is applied'}
      hoverOpenDelay={700}
      position={'bottom'}
    >
      <Checkbox
        checked={popStash}
        className={clsx(css.popCheckbox, { 'bp3-skeleton': loading })}
        label={'Pop stash'}
        onChange={() => setPopStash(!popStash)}
      />
    </Tooltip>

    <div className={css.actions}>
      <Button
        className={clsx(css.mainBtn, { 'bp3-skeleton': loading })}
        disabled={selected === undefined || modified.length > 0}
        intent={'primary'}
        text={'Apply Stash'}
        onClick={applyStash}
      />
    </div>

    <Alert
      cancelButtonText={'Cancel'}
      confirmButtonText={'Clear'}
      icon={'trash'}
      intent={'danger'}
      isOpen={clearAlert}
      onClose={() => setClearAlert(false)}
      onConfirm={() => {
        setClearAlert(false);
        clear();
      }}
    >
      Delete all stashes in the repository?
    </Alert>
  </div>);
};