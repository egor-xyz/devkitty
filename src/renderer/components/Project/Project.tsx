import { Button, ButtonGroup, Classes, Colors, Icon, Popover } from '@blueprintjs/core';
import { type FC, Fragment, useMemo } from 'react';
import { useGit } from 'renderer/hooks/useGit';
import { useModal } from 'renderer/hooks/useModal';
import { useMountEffect } from 'renderer/hooks/useMountEffect';
import { cn } from 'renderer/utils/cn';
import { type Project as IProject } from 'types/project';
import { type Worktree } from 'types/worktree';

import { CheckoutCard } from './components/CheckoutCard';
import { Error } from './components/Error';
import { ProjectMenu } from './components/ProjectMenu';
import { PullRequest } from './components/PullRequest';
import { QuickActions } from './components/QuickActions';
import { useRepoData } from './hooks/useRepoData';

type Props = {
  project: IProject;
};

export const Project: FC<Props> = ({ project }) => {
  const { getStatus, gitStatus, loading, pull } = useGit();
  const { openModal } = useModal();

  const {
    clearHiddenPulls,
    clearHiddenRuns,
    getOrphanPulls,
    hiddenPullCount,
    hiddenRunCount,
    hidePull,
    hideRun,
    pullsByBranch,
    refresh,
    runsByBranch
  } = useRepoData(project);

  const { filePath, groupId, id, name } = project;

  const updateProject = () => {
    refresh();
    getStatus(id);
  };

  const runPull = async () => {
    await pull(id, name);
    refresh();
  };

  const removeAlert = () => {
    openModal({
      name: 'remove:project',
      props: { id, name }
    });
  };

  const ignoreWorkflow = (workflowName: string, workflowPath: string) => {
    openModal({ name: 'ignore:workflow', props: { workflowName, workflowPath } });
  };

  useMountEffect(() => {
    getStatus(id, true);
  });

  // A repo always has at least its main worktree. Older status payloads and
  // failed `git worktree list` calls leave it undefined — synthesise it so a
  // zero-worktree repo still renders exactly one card.
  const worktrees: Worktree[] = useMemo(() => {
    if (gitStatus?.worktrees?.length) return gitStatus.worktrees;
    if (!gitStatus?.branchSummary?.current) return [];

    return [{ branch: gitStatus.branchSummary.current, isMain: true, path: filePath }];
  }, [filePath, gitStatus]);

  const orphans = getOrphanPulls(worktrees.map((worktree) => worktree.branch)).filter(({ tags }) => tags.length > 0);
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
        </div>

        <QuickActions
          gitStatus={gitStatus}
          onUpdate={updateProject}
          project={project}
        />

        <div
          className={cn(
            'flex relative flex-row-reverse min-w-[79px] ml-auto select-none',
            !gitStatus && Classes.SKELETON
          )}
        >
          <ButtonGroup large>
            <Button
              icon="refresh"
              onClick={updateProject}
            />

            <Popover
              content={
                <ProjectMenu
                  clearHiddenPulls={clearHiddenPulls}
                  clearHiddenRuns={clearHiddenRuns}
                  filePath={filePath}
                  getStatus={updateProject}
                  gitStatus={gitStatus}
                  groupId={groupId}
                  hiddenCount={hiddenRunCount}
                  hiddenPullCount={hiddenPullCount}
                  id={id}
                  name={name}
                  pull={runPull}
                  removeProject={removeAlert}
                />
              }
              placement="auto-end"
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

      {worktrees.map((worktree) => (
        <Fragment key={worktree.path}>
          <CheckoutCard
            gitStatus={worktree.isMain ? gitStatus : undefined}
            onHidePull={hidePull}
            onHideRun={hideRun}
            onIgnoreWorkflow={ignoreWorkflow}
            onRefresh={updateProject}
            project={project}
            pulls={pullsByBranch[worktree.branch] ?? []}
            runs={runsByBranch[worktree.branch] ?? []}
            worktree={worktree}
          />

          {worktree.isMain && orphans.length > 0 && (
            <div className="pl-5">
              {orphans.map(({ pull, tags }) => (
                <PullRequest
                  key={pull.id}
                  onHide={hidePull}
                  projectId={id}
                  pull={pull}
                  tags={tags}
                />
              ))}
            </div>
          )}
        </Fragment>
      ))}
    </>
  );
};
