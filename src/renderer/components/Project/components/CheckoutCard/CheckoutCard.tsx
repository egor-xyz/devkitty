import { Button, ButtonGroup, Classes, Collapse, Spinner, Tag, Tooltip } from '@blueprintjs/core';
import { type FC, type ReactNode, useCallback, useEffect, useState } from 'react';
import { FaCopy, FaRegCopy } from 'react-icons/fa';
import { GitStatusBadge } from 'renderer/components/GitStatusBadge';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { useModal } from 'renderer/hooks/useModal';
import { cn } from 'renderer/utils/cn';
import { type GitStatus, type Project } from 'types/project';
import { type Worktree } from 'types/worktree';

import { type DetailGroup, splitOverflow } from '../../hooks/useRepoData/groupByBranch';
import { CheckoutBranch } from '../CheckoutBranch';
import { FoldDivider } from '../FoldDivider';
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
  onHidePull: (pullId: number, label: string) => void;
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
  onRefresh,
  onToggleExpanded,
  project,
  runsLoaded,
  trailing,
  worktree
}) => {
  const { openModal } = useModal();
  const {
    gitHubActions: { count },
    gitHubToken,
    selectedEditor,
    selectedShell
  } = useAppSettings();
  const [status, setStatus] = useState<CheckoutStatus | null>(null);
  const [showStray, setShowStray] = useState(false);
  const [showAllOwn, setShowAllOwn] = useState(false);
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

    navigator.clipboard.writeText(worktree.path);
  };

  const handleDelete = () => {
    openModal({
      name: 'git:worktree:remove',
      props: {
        branch: worktree.branch,
        id: project.id,
        onFailure: () => setDeleting(false),
        onStart: () => setDeleting(true),
        onSuccess: onRefresh,
        worktreePath: worktree.path
      }
    });
  };

  // Pre-fetch state looks exactly like the empty state, so a card expanded from
  // saved storage would flash "No actions were found" on every app start.
  // Only the main card explains itself when empty. A worktree with nothing on
  // it just stays a single line — a dozen "no actions found" banners is noise,
  // not information.
  const isBlank = isMain && runsLoaded && groups.length === 0;

  // Branches with no worktree anywhere land on the main card. There can be
  // dozens of them, so they fold away rather than burying this repo's actual
  // checkouts under a wall of other people's pull requests.
  const stray = groups.filter((group) => group.orphan);
  const { hidden: hiddenOwn, visible: visibleOwn } = splitOverflow(groups.filter((group) => !group.orphan));

  // A pull request and its runs are one block: no gaps inside it, a clear gap
  // before the next one, and a tinted head.
  const renderGroup = ({ pull, runs }: DetailGroup, index: number) => (
    <div
      className={cn(
        // No overflow-hidden here: it would make this box the scrollport for
        // the sticky run rows inside, which kills their pinning.
        'mx-2 rounded-md',
        index > 0 && 'mt-2',
        pull && 'bg-bp-light-gray-4 dark:bg-bp-dark-gray-2',
        pull && 'shadow-[0_0_0_1px_rgba(0,0,0,0.06)] dark:shadow-[0_0_0_1px_rgba(0,0,0,0.35)]',
        '[&>*]:mt-0'
      )}
      key={pull ? `pull-${pull.pull.id}` : `runs-${index}`}
    >
      {pull && (
        <PullRequest
          onHide={onHidePull}
          projectId={project.id}
          pull={pull.pull}
          tags={pull.tags}
        />
      )}

      {/* Main carries the whole repo's traffic, so it gets the configured cap;
          a worktree only ever shows its own branch and keeps the default. */}
      <GroupRuns
        limit={isMain ? count : undefined}
        onRefresh={onRefresh}
        project={project}
        runs={runs}
        stickyTop={isMain ? 55 : 100}
      />
    </div>
  );

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

        {/* The row itself is the toggle — no chevron. Everything interactive
            inside it stops the click from reaching this handler. */}
        <div
          className="overflow-hidden flex flex-1 text-left justify-start gap-4 items-center min-w-0 cursor-pointer self-stretch"
          onClick={onToggleExpanded}
        >
          {/* Main names its branch in the selector beside it, so printing it
              here too is the same word twice on one line. */}
          {!isMain && (
            <div className="overflow-hidden flex flex-col">
              <div className="overflow-hidden flex gap-2 items-center text-ellipsis whitespace-nowrap">
                {/* No merged tag here: the pull request row inside already says
                    so, and repeating it on the checkout is noise. */}
                <b className={cn('truncate', done && Classes.TEXT_MUTED)}>{worktree.branch}</b>
              </div>

              {/* Removing a worktree takes a moment, and the row is the only
                  place that can say so. */}
              {deleting ? (
                <div className="flex items-center gap-1.5 -mt-0.5 text-[11px] font-light dark:text-bp-gray-3">
                  <Spinner size={10} />
                  Removing…
                </div>
              ) : (
                <Tooltip content={worktree.path}>
                  <div className="overflow-hidden whitespace-nowrap text-ellipsis -mt-0.5 text-[11px] font-light dark:text-bp-gray-3">
                    {abbreviated}
                  </div>
                </Tooltip>
              )}
            </div>
          )}

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
          <Tooltip compact
            content="Copy path"
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
          {visibleOwn.map(renderGroup)}
          <Collapse isOpen={showAllOwn}>{hiddenOwn.map(renderGroup)}</Collapse>

          {hiddenOwn.length > 0 && (
            <FoldDivider
              hideLabel={`Hide ${hiddenOwn.length} more pull request${hiddenOwn.length > 1 ? 's' : ''}`}
              onToggle={() => setShowAllOwn((prev) => !prev)}
              open={showAllOwn}
              showLabel={`Show ${hiddenOwn.length} more pull request${hiddenOwn.length > 1 ? 's' : ''}`}
            />
          )}

          {stray.length > 0 && (
            <FoldDivider
              hideLabel={`Hide ${stray.length} branch${stray.length > 1 ? 'es' : ''} not checked out locally`}
              onToggle={() => setShowStray((prev) => !prev)}
              open={showStray}
              showLabel={`Show ${stray.length} branch${stray.length > 1 ? 'es' : ''} not checked out locally`}
            />
          )}

          <Collapse isOpen={showStray}>{stray.map(renderGroup)}</Collapse>

          {gitHubToken && isBlank && (
            <div className={cn('flex justify-between items-center py-2.5 px-4', Classes.TEXT_MUTED)}>
              <span>
                No actions were found for the <b>{worktree.branch}</b> branch in the last 24 hours
              </span>

              <Tag minimal>watcher is active</Tag>
            </div>
          )}
        </div>
      </Collapse>
    </>
  );
};
