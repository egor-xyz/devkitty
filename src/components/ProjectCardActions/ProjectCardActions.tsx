import { Dispatch, FC } from 'react';
import { Button, ButtonGroup, Tooltip } from '@blueprintjs/core';
import clsx from 'clsx';

import { Project } from 'models';
import { AppStoreActions, AppStoreState, useAppStore, useAppStoreDispatch } from 'context';
import { onContextMenu } from 'components';
import { useModalsStore } from 'modals/context';

import { Root } from './ProjectCardActions.styles';

interface Props {
  fetchFolder: (folder: Project, dispatch: Dispatch<AppStoreActions>) => void;
  project: Project;
  pullFolder: (folder: Project, dispatch: Dispatch<AppStoreActions>, state: AppStoreState) => void;
}

export const ProjectCardActions: FC<Props> = ({ project, fetchFolder, pullFolder }) => {
  const state = useAppStore();
  const dispatch = useAppStoreDispatch();
  const { loading } = state;

  const { openModal } = useModalsStore();
  return (<Root>
    <ButtonGroup fill={false}>
      {!project.status.behind && (
        <Button
          className={clsx('button', { 'bp3-skeleton': loading[project.repo] })}
          disabled={!project.status.tracking}
          icon='refresh'
          loading={loading[project.repo]}
          onClick={() => fetchFolder(project, dispatch)}
        />
      )}
      {!!project.status.behind && (
        <Tooltip
          content={`Pull (${project.status.behind})`}
          position={'left'}
        >
          <Button
            className={clsx('button', { 'bp3-skeleton': loading[project.repo] })}
            icon='arrow-down'
            intent='primary'
            onClick={() => pullFolder(project, dispatch, state)}
          />
        </Tooltip>
      )}
      <Button
        className={clsx('button', { 'bp3-skeleton': loading[project.repo] })}
        icon='menu'
        onClick={(e: any) => onContextMenu(e, project, state, dispatch, openModal)}
      />
    </ButtonGroup>
  </Root>);
};