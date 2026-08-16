import { Button, ButtonGroup, Classes, Tag, Tooltip } from '@blueprintjs/core';
import { type FC, Fragment, useCallback, useEffect, useState } from 'react';
import { FaCopy, FaRegCopy } from 'react-icons/fa';
import { GitStatusBadge } from 'renderer/components/GitStatusBadge';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { useModal } from 'renderer/hooks/useModal';
import { appToaster } from 'renderer/utils/appToaster';
import { cn } from 'renderer/utils/cn';
import { type Run } from 'types/gitHub';
import { type GitStatus, type Project } from 'types/project';
import { type Worktree } from 'types/worktree';

import { type PullWithTags } from '../../hooks/useRepoData/groupByBranch';
import { CheckoutBranch } from '../CheckoutBranch';
import { PullRequest } from '../PullRequest';
import { Workflow } from '../Workflow';

const size = 16;

type CheckoutStatus = {
  ahead: number;
  behind: number;
  modified: string[];
};

type Props = {
  expanded: boolean;
  gitStatus?: GitStatus;
  onHidePull: (pullId: number) => void;
  onHideRun: (runId: number) => void;
  onIgnoreWorkflow: (workflowName: string, workflowPath: string) => void;
  onRefresh: () => void;
  project: Project;
  pulls: PullWithTags[];
  runs: Run[];
  runsLoaded: boolean;
  worktree: Worktree;
};

export const CheckoutCard: FC<Props> = ({
  expanded,
  gitStatus,
  onHidePull,
  onHideRun,
  onIgnoreWorkflow,
  onRefresh,
  project,
  pulls,
  runs,
  runsLoaded,
  worktree
}) => {
  const { openModal } = useModal();
  const {
    gitHubActions: { inProgress },
    gitHubToken,
    selectedEditor,
    selectedShell
  } = useAppSettings();
  const [status, setStatus] = useState<CheckoutStatus | null>(null);
  const [pullLoading, setPullLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copyIcon, setCopyIcon] = useState(
    <FaRegCopy
      className="text-bp-gray-1 dark:text-bp-gray-4"
      size={size}
    />
  );

  const { isMain } = worktree;
  const abbreviated = worktree.path.replace(/^.*\//, '.../');

  const fetchStatus = useCallback(async () => {
    if (isMain) return;

    const res = await window.bridge.worktree.getStatus(worktree.path);
    if (res.success && res.status) {
      setStatus({
        ahead: res.status.ahead,
        behind: res.status.behind,
        modified: res.status.modified
      });
    }
  }, [isMain, worktree.path]);

  useEffect(() => {
    if (isMain) {
      setStatus(
        gitStatus?.status
          ? {
              ahead: gitStatus.status.ahead,
              behind: gitStatus.status.behind,
              modified: gitStatus.status.modified
            }
          : null
      );
      return;
    }

    fetchStatus();
  }, [fetchStatus, gitStatus, isMain]);

  const copyToClipboard = () => {
    setCopyIcon(
      <FaCopy
        className="text-bp-gray-1 dark:text-bp-gray-4"
        size={size}
      />
    );
    setTimeout(
      () =>
        setCopyIcon(
          <FaRegCopy
            className="text-bp-gray-1 dark:text-bp-gray-4"
            size={size}
          />
        ),
      1000
    );

    navigator.clipboard.writeText(worktree.branch);
  };

  const runPull = async () => {
    setPullLoading(true);
    const res = isMain
      ? await window.bridge.git.pull(project.id)
      : await window.bridge.worktree.pull(project.id, worktree.path);
    setPullLoading(false);

    if (!res.success) {
      (await appToaster).show({
        icon: 'info-sign',
        intent: 'warning',
        message: `${project.name} pull ${res.message}`,
        timeout: 0
      });
    }

    await fetchStatus();
    onRefresh();
  };

  const handleDelete = () => {
    openModal({
      name: 'git:worktree:remove',
      props: {
        branch: worktree.branch,
        id: project.id,
        onSuccess: async () => {
          setDeleting(true);
          onRefresh();
        },
        worktreePath: worktree.path
      }
    });
  };

  // Pre-fetch state looks exactly like the empty state, so a card expanded from
  // saved storage would flash "No actions were found" on every app start.
  const isBlank = runsLoaded && runs.length === 0 && pulls.length === 0;

  const runRows = runs.map((run) => (
    <Workflow
      key={run.id}
      onHide={onHideRun}
      onIgnore={onIgnoreWorkflow}
      onRefresh={onRefresh}
      project={project}
      run={run}
    />
  ));

  return (
    <>
      <div
        className={cn(
          'flex relative items-center justify-between min-h-[45px] py-1 pl-5 pr-4 gap-2 w-full box-border shrink-0 mt-0.5',
          'bg-bp-light-gray-4 dark:bg-bp-dark-gray-2',
          deleting && 'opacity-50 pointer-events-none'
        )}
      >
        <div className="overflow-hidden flex text-left justify-start gap-4 items-center flex-1 min-w-0">
          <div className="overflow-hidden flex flex-col">
            <div className="overflow-hidden text-ellipsis whitespace-nowrap">
              <b>{worktree.branch}</b>
            </div>

            <Tooltip content={worktree.path}>
              <div className="overflow-hidden whitespace-nowrap text-ellipsis -mt-0.5 text-[11px] font-light dark:text-bp-gray-3">
                {abbreviated}
              </div>
            </Tooltip>
          </div>

          {status && (
            <div className="flex select-none">
              <GitStatusBadge
                count={status.modified.length}
                icon="document"
                intent="danger"
                show={Boolean(status.modified.length)}
                tooltip={
                  <>
                    <b>{worktree.branch}</b> has <b>{status.modified.length}</b> uncommited changed file
                    {status.modified.length > 1 ? 's' : ''}
                  </>
                }
              />

              <GitStatusBadge
                count={status.ahead}
                icon="arrow-up"
                intent="warning"
                show={Boolean(status.ahead)}
                tooltip={
                  <>
                    <b>{worktree.branch}</b> has <b>{status.ahead}</b> ahead commit{status.ahead > 1 ? 's' : ''}
                  </>
                }
              />

              <GitStatusBadge
                count={status.behind}
                icon="arrow-down"
                intent="primary"
                show={Boolean(status.behind)}
                tooltip={
                  <>
                    <b>{worktree.branch}</b> has <b>{status.behind}</b> behind commit{status.behind > 1 ? 's' : ''}
                  </>
                }
              />
            </div>
          )}
        </div>

        <div className="flex min-w-[240px]">
          {isMain && (
            <CheckoutBranch
              getStatus={onRefresh}
              gitStatus={gitStatus}
              id={project.id}
              name={project.name}
            />
          )}
        </div>

        <ButtonGroup>
          {Boolean(status?.behind) && (
            <Tooltip compact
              content="Pull"
              hoverOpenDelay={500}
              placement="bottom"
            >
              <Button
                disabled={deleting}
                icon="arrow-down"
                intent="warning"
                loading={pullLoading}
                onClick={runPull}
              />
            </Tooltip>
          )}

          <Tooltip compact
            content="Copy branch name"
            hoverOpenDelay={500}
            placement="bottom"
          >
            <Button
              disabled={deleting}
              icon={copyIcon}
              onClick={copyToClipboard}
            />
          </Tooltip>

          {selectedEditor && (
            <Tooltip compact
              content={selectedEditor.editor}
              hoverOpenDelay={500}
              placement="bottom"
              popoverClassName="whitespace-nowrap"
            >
              <Button
                disabled={deleting}
                icon="code"
                onClick={() => window.bridge.launch.editor(worktree.path, selectedEditor)}
              />
            </Tooltip>
          )}

          {selectedShell && (
            <Tooltip compact
              content={selectedShell.shell}
              hoverOpenDelay={500}
              placement="bottom"
              popoverClassName="whitespace-nowrap"
            >
              <Button
                disabled={deleting}
                icon="console"
                onClick={() => window.bridge.launch.shell(worktree.path, selectedShell)}
              />
            </Tooltip>
          )}

          {!isMain && (
            <Tooltip compact
              content="Remove worktree"
              hoverOpenDelay={500}
              placement="bottom"
            >
              <Button
                disabled={deleting}
                icon="trash"
                loading={deleting}
                onClick={handleDelete}
              />
            </Tooltip>
          )}
        </ButtonGroup>
      </div>

      {expanded && (
        <div className="pl-5">
          {pulls.map(({ pull, tags }, index) => (
            <Fragment key={pull.id}>
              <PullRequest
                onHide={onHidePull}
                projectId={project.id}
                pull={pull}
                tags={tags}
              />

              {index === 0 && <div className="pl-5">{runRows}</div>}
            </Fragment>
          ))}

          {pulls.length === 0 && runRows}

          {gitHubToken && isBlank && (
            <div className={cn('flex justify-between items-center py-2.5 px-4', Classes.TEXT_MUTED)}>
              <span>
                No actions {inProgress && 'in progress'} were found for the <b>{worktree.branch}</b> branch in the last{' '}
                {inProgress ? '30 minutes' : '24 hours'}
              </span>

              <Tag minimal>watcher is active</Tag>
            </div>
          )}
        </div>
      )}
    </>
  );
};
