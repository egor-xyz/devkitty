import { Button, ButtonGroup, Classes, Colors, Icon, Popover } from '@blueprintjs/core';
import { type FC, useState } from 'react';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { useGit } from 'renderer/hooks/useGit';
import { useModal } from 'renderer/hooks/useModal';
import { useMountEffect } from 'renderer/hooks/useMountEffect';
import { cn } from 'renderer/utils/cn';
import { type Project as IProject } from 'types/project';

import { GitStatusGroup } from '../GitStatusGroup';
import { CheckoutBranch } from './components/CheckoutBranch';
import { Error } from './components/Error';
import { ProjectMenu } from './components/ProjectMenu';
import { QuickActions } from './components/QuickActions';
import { WorktreeList } from './components/WorktreeList';
import { useActions } from './hooks/useActions';
import { usePulls } from './hooks/usePulls';

type Props = {
  project: IProject;
};

export const Project: FC<Props> = ({ project }) => {
  const { getStatus, gitStatus, loading, pull } = useGit();
  const { openModal } = useModal();
  const { showWorktrees } = useAppSettings();
  const [pullLoading, setPullLoading] = useState(false);

  const { Actions, clearHiddenRuns, getActions, hiddenCount, showActions, toggleActions } = useActions(gitStatus, project);
  const { Pulls, refreshPulls, showPulls, togglePulls } = usePulls(project);

  const { filePath, groupId, id, name } = project;

  const updateProject = () => {
    if (showActions) getActions();
    if (showPulls) refreshPulls();
    getStatus(id);
  };

  const runPull = async () => {
    setPullLoading(true);
    await pull(id, name);
    setPullLoading(false);
  };

  const removeAlert = () => {
    openModal({
      name: 'remove:project',
      props: { id, name }
    });
  };

  useMountEffect(() => {
    getStatus(id, true);
  });

  const behind = gitStatus?.status?.behind ?? 0;

  if (gitStatus && !gitStatus.success) {
    return (
      <Error
        name={name}
        removeAlert={removeAlert}
      />
    );
  }

  return (
    <>
      <div
        className={cn(
          'flex relative items-center justify-between min-h-[55px] py-0.5 pl-5 pr-4',
          'bg-bp-light-gray-4 dark:bg-bp-dark-gray-2',
          '[&+&]:mt-0.5'
        )}
      >
        <div className="flex flex-1 items-center justify-between w-full pr-2.5 gap-2.5">
          <div className={cn('flex flex-col', loading && !gitStatus && Classes.SKELETON)}>
            <div className="font-medium">{name}</div>

            <div className="text-[11px] font-light -mt-0.5 dark:text-bp-gray-3">
              {gitStatus?.organization ?? 'Local git'}
            </div>
          </div>

          <GitStatusGroup
            gitStatus={gitStatus}
            name={name}
          />
        </div>

        <div className="flex flex-2 items-center min-w-[395px] gap-2.5">
          <CheckoutBranch
            getStatus={updateProject}
            gitStatus={gitStatus}
            id={id}
            name={name}
          />

          <QuickActions
            gitStatus={gitStatus}
            onUpdate={updateProject}
            project={project}
            showActions={showActions}
            showPulls={showPulls}
            toggleActions={toggleActions}
            togglePulls={togglePulls}
          />
        </div>

        <div className={cn('flex relative flex-row-reverse min-w-[79px] ml-auto select-none', !gitStatus && Classes.SKELETON)}>
          <ButtonGroup large>
            {!behind && (
              <Button
                icon="refresh"
                onClick={updateProject}
              />
            )}

            {Boolean(behind) && (
              <Button
                icon="arrow-down"
                intent="warning"
                loading={pullLoading}
                onClick={runPull}
              />
            )}

            <Popover
              content={
                <ProjectMenu
                  clearHiddenRuns={clearHiddenRuns}
                  filePath={filePath}
                  getStatus={updateProject}
                  gitStatus={gitStatus}
                  groupId={groupId}
                  hiddenCount={hiddenCount}
                  id={id}
                  name={name}
                  pull={runPull}
                  removeProject={removeAlert}
                />
              }
              placement="bottom-end"
            >
              <Button
                icon="caret-down"
                intent={behind ? 'warning' : 'none'}
              />
            </Popover>
          </ButtonGroup>

          <Icon
            className={cn(
              'absolute top-1/2 -left-[22px] mr-2.5 -translate-y-1/2 origin-center opacity-0',
              loading && 'animate-[blink_3s_infinite]'
            )}
            color={Colors.ORANGE1}
            icon="dot"
          />
        </div>
      </div>

      {showWorktrees && gitStatus?.worktrees?.length > 0 && (
        <WorktreeList
          gitStatus={gitStatus}
          id={id}
          name={name}
          onSuccess={updateProject}
        />
      )}

      {Actions}
      {Pulls}
    </>
  );
};
