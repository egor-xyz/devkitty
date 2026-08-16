import { Button, ButtonGroup, Classes, Collapse, Tag, Tooltip } from '@blueprintjs/core';
import { type FC, Fragment, type ReactNode, useCallback, useEffect, useState } from 'react';
import { FaCopy, FaRegCopy } from 'react-icons/fa';
import { GitStatusBadge } from 'renderer/components/GitStatusBadge';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { useModal } from 'renderer/hooks/useModal';
import { appToaster } from 'renderer/utils/appToaster';
import { cn } from 'renderer/utils/cn';
import { type GitStatus, type Project } from 'types/project';
import { type Worktree } from 'types/worktree';

import { type DetailGroup } from '../../hooks/useRepoData/groupByBranch';
import { CheckoutBranch } from '../CheckoutBranch';
import { PullRequest } from '../PullRequest';
import { GroupRuns } from './GroupRuns';

const size = 16;

type CheckoutStatus = {
  ahead: number;
  behind: number;
  modified: string[];
};

type Props = {
  done?: boolean;
  expanded: boolean;
  gitStatus?: GitStatus;
  groups: DetailGroup[];
  leading?: ReactNode;
  onHidePull: (pullId: number) => void;
  onHideRun: (runId: number) => void;
  onIgnoreWorkflow: (workflowName: string, workflowPath: string) => void;
  onRefresh: () => void;
  onToggleExpanded: () => void;
  project: Project;
  runsLoaded: boolean;
  trailing?: ReactNode;
  worktree: Worktree;
};

export const CheckoutCard: FC<Props> = ({
  done,
  expanded,
  gitStatus,
  groups,
  leading,
  onHidePull,
  onHideRun,
  onIgnoreWorkflow,
  onRefresh,
  onToggleExpanded,
  project,
  runsLoaded,
  trailing,
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

  // Only the main checkout offers a pull button, so this only ever runs there.
  const runPull = async () => {
    setPullLoading(true);
    const res = await window.bridge.git.pull(project.id);
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
  const isBlank = runsLoaded && groups.length === 0;

  return (
    <>
      <div
        className={cn(
          'flex relative items-center justify-start py-1 pl-5 pr-4 gap-3 w-full box-border shrink-0 mt-0.5',
          'bg-bp-light-gray-4 dark:bg-bp-dark-gray-2',
          // The main checkout IS the repo header, so it is taller and pins to
          // the top; worktrees pin just beneath it while their contents scroll.
          isMain ? 'h-[55px] sticky top-0 z-20' : 'h-[45px] sticky top-[55px] z-10',
          expanded && 'shadow-[0_2px_6px_-1px_rgba(0,0,0,0.20)] dark:shadow-[0_2px_6px_-1px_rgba(0,0,0,0.6)]',
          deleting && 'opacity-50 pointer-events-none'
        )}
      >
        {leading}

        <Tooltip compact
          content={expanded ? 'Hide actions & pull requests' : 'Show actions & pull requests'}
          hoverOpenDelay={500}
          placement="bottom"
        >
          <Button
            icon={expanded ? 'chevron-down' : 'chevron-right'}
            minimal
            onClick={onToggleExpanded}
          />
        </Tooltip>

        <div className="overflow-hidden flex flex-1 text-left justify-start gap-4 items-center min-w-0">
          <div className="overflow-hidden flex flex-col">
            <div className="overflow-hidden flex gap-2 items-center text-ellipsis whitespace-nowrap">
              <b className={cn('truncate', done && Classes.TEXT_MUTED)}>{worktree.branch}</b>

              {done && (
                <Tag intent="success"
                  minimal
                >
                  merged
                </Tag>
              )}
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

        {isMain && (
          <div className="flex shrink-0 min-w-[240px]">
            <CheckoutBranch
              getStatus={onRefresh}
              gitStatus={gitStatus}
              id={project.id}
              name={project.name}
            />
          </div>
        )}

        <ButtonGroup className="ml-auto">
          {isMain && Boolean(status?.behind) && (
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

        {trailing}
      </div>

      <Collapse isOpen={expanded}>
        <div
          className={cn(
            // No indentation at any level. What belongs to this checkout reads
            // as recessed instead: a darker surface, sunk behind the header.
            'bg-bp-light-gray-3 dark:bg-bp-dark-gray-1',
            'shadow-[inset_0_3px_6px_-2px_rgba(0,0,0,0.18)] dark:shadow-[inset_0_3px_6px_-2px_rgba(0,0,0,0.55)]'
          )}
        >
          {groups.map(({ orphan, pull, runs }, index) => (
            <Fragment key={pull ? `pull-${pull.pull.id}` : `runs-${index}`}>
              {orphan && !groups[index - 1]?.orphan && (
                <div className={cn('flex items-center gap-3 py-1.5 px-4 select-none', Classes.TEXT_MUTED)}>
                  <span className="flex-1 h-px bg-bp-light-gray-1 dark:bg-bp-dark-gray-4" />
                  <span className="text-[11px] whitespace-nowrap">not checked out locally</span>
                  <span className="flex-1 h-px bg-bp-light-gray-1 dark:bg-bp-dark-gray-4" />
                </div>
              )}

              {pull && (
                <div className="bg-bp-light-gray-4/70 dark:bg-bp-dark-gray-2/70">
                  <PullRequest
                    onHide={onHidePull}
                    projectId={project.id}
                    pull={pull.pull}
                    tags={pull.tags}
                  />
                </div>
              )}

              <GroupRuns
                onHide={onHideRun}
                onIgnore={onIgnoreWorkflow}
                onRefresh={onRefresh}
                project={project}
                runs={runs}
              />
            </Fragment>
          ))}

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
      </Collapse>
    </>
  );
};
