import { FC, useEffect, useMemo, useState } from 'react';
import { Button, Classes, Icon, ProgressBar } from '@blueprintjs/core';

import { Project } from 'models';
import { mergeBranches } from 'utils';
import { BranchSelect } from 'components/BranchSelect';
import { Root } from 'modals/components/MergeModal/MergeModal.styles';
import { useAppStore, useAppStoreDispatch } from 'context';
import { useModalsStore } from 'modals/context';

export const MergeModal:FC = () => {
  const state = useAppStore();
  const dispatch = useAppStoreDispatch();
  const { data, closeModal, openModal } = useModalsStore();

  const [mergeDone, setMergeDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState<string>();
  const [to, setTo] = useState<string>();

  const { mergeFavorites, appStatus } = state;

  const merge = async (): Promise<void> => {
    if (!to || !from) return;

    const project: Project = data?.project;
    if (!project) return;

    dispatch({
      payload: {
        ...mergeFavorites,
        [project.repo]: to
      },
      type: 'setMergeFavorites'
    });

    setLoading(true);

    const res =  await mergeBranches(project, from, to, state, dispatch, openModal);
    if (!res) {
      setMergeDone(true);
      return;
    }

    closeModal();
  };

  useEffect(() => {
    const project: Project = data?.project;
    if (!project) return;
    setFrom(project.branch.current);
    setTo(mergeFavorites[project.repo]);
  }, []); // eslint-disable-line

  const project: Project = data?.project;

  return useMemo(() => {
    if (!project) return null;
    return (<Root>
      <div className={Classes.DIALOG_BODY}>
        {!loading && (
          <div className='raw'>
            <BranchSelect
              className='select'
              defaultValue='Choose branch'
              mode={'readonly'}
              project={project}
              value={from}
              onChange={setFrom}
            />

            <Icon
              className='icon'
              icon='arrow-right'
            />

            <BranchSelect
              className='select'
              defaultValue='Choose branch'
              mode={'readonly'}
              project={project}
              value={to}
              onChange={setTo}
            />
          </div>
        )}

        {loading && (
          <div className='progress'>
            {!mergeDone && <ProgressBar intent='primary' />}
            <div className='progress_status'>
              <span>{appStatus}</span>
            </div>
          </div>
        )}
      </div>

      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button
            onClick={() => {
              dispatch({ type: 'setAppStatus' });
              closeModal();
            }}
          >Close</Button>

          {!mergeDone && (
            <Button
              intent='primary'
              loading={loading}
              onClick={merge}
            >Merge</Button>
          )}
        </div>
      </div>
    </Root>);
  }, [data, loading, mergeDone, from, to, mergeFavorites, appStatus]); // eslint-disable-line
};