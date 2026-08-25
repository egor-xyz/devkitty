import { Button, ButtonGroup, Classes, Collapse, Spinner, Tag, Tooltip } from '@blueprintjs/core';
import { type FC, type ReactNode, useCallback, useEffect, useState } from 'react';
import { FaCopy, FaRegCopy } from 'react-icons/fa';
import { GitStatusBadge } from 'renderer/components/GitStatusBadge';
import { useAppSettings, useIsSunset } from 'renderer/hooks/useAppSettings';
import { useModal } from 'renderer/hooks/useModal';
import { cn } from 'renderer/utils/cn';
import { type Run } from 'types/gitHub';
import { type GitStatus, type Project } from 'types/project';
import { type Worktree } from 'types/worktree';

import { type DetailGroup, splitOverflow } from '../../hooks/useRepoData/groupByBranch';
import { CheckoutBranch } from '../CheckoutBranch';
import { FoldBar, FoldChip } from '../FoldBar';
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
  // Runs of workflows you hid. Not shown, just offered — a fold to peek behind
  // without putting them back.
  hiddenRuns: Run[];
  leading?: ReactNode;
  loadingOlder: boolean;
  moreHistory: boolean;
  onHidePull: (pullId: number, label: string) => void;
  onLoadOlder: () => void;
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
  hiddenRuns,
  leading,
  loadingOlder,
  moreHistory,
  onHidePull,
  onLoadOlder,
  onRefresh,
  onToggleExpanded,
  project,
  runsLoaded,
  trailing,
  worktree
}) => {
  const { openModal } = useModal();
  const {
    fetchInterval,
    gitHubActions: { count },
    gitHubToken,
    selectedEditor,
    selectedShell
  } = useAppSettings();
  const isSunset = useIsSunset();
  const [status, setStatus] = useState<CheckoutStatus | null>(null);
  const [showStray, setShowStray] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
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

  // Main's status arrives with the repo poll, but a worktree has no such feed —
  // without its own clock the ahead/behind counts stayed at whatever they were
  // when the card mounted, through every rebase and push.
  useEffect(() => {
    if (isMain) return;

    const timer = window.setInterval(() => {
      if (!document.hidden) fetchStatus();
    }, fetchInterval > 2000 ? fetchInterval : 10000);

    return () => window.clearInterval(timer);
  }, [fetchInterval, fetchStatus, isMain]);

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

  // An expanded card with nothing in it reads as a broken click, so it says so
  // instead. Gated on `runsLoaded`: pre-fetch state looks exactly like the empty
  // state, and a card expanded from saved storage would otherwise flash this on
  // every app start.
  const isBlank = runsLoaded && groups.length === 0 && hiddenRuns.length === 0;

  // Branches with no worktree anywhere land on the main card. There can be
  // dozens of them, so they fold away rather than burying this repo's actual
  // checkouts under a wall of other people's pull requests.
  const stray = groups.filter((group) => group.orphan);
  const { hidden: hiddenOwn, visible: visibleOwn } = splitOverflow(groups.filter((group) => !group.orphan));

  // A pull request and its runs are one block: no gaps inside it, a clear gap
  // before the next one, and a tinted head.
  const renderGroup = ({ pull, runs }: DetailGroup, index: number, footer?: ReactNode) => (
    <div
      className={cn(
        // No overflow-hidden here: it would make this box the scrollport for
        // the sticky run rows inside, which kills their pinning.
        'mx-2 rounded-md',
        index > 0 && 'mt-2',
        // Only the ring holds the block together — no fill. The rows bring their
        // own background, so a fill would only show through behind the fold
        // dividers and read as a stray band.
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
        footer={footer}
        limit={isMain ? count : undefined}
        loadingOlder={loadingOlder}
        moreHistory={moreHistory}
        onLoadOlder={onLoadOlder}
        onRefresh={onRefresh}
        paged={!pull}
        project={project}
        runs={runs}
        stickyTop={isMain ? 55 : 100}
      />
    </div>
  );

  const cardChips =
    hiddenOwn.length > 0 || stray.length > 0 || hiddenRuns.length > 0 ? (
      <>
        {hiddenOwn.length > 0 && (
          <FoldChip
            icon="git-pull"
            label="More pull requests"
            onToggle={() => setShowAllOwn((prev) => !prev)}
          />
        )}

        {stray.length > 0 && (
          <FoldChip
            icon="git-branch"
            label="Other branches"
            onToggle={() => setShowStray((prev) => !prev)}
          />
        )}

        {hiddenRuns.length > 0 && (
          <FoldChip
            icon="eye-off"
            label="Hidden workflows"
            onToggle={() => setShowHidden((prev) => !prev)}
          />
        )}
      </>
    ) : null;

  return (
    <>
      <div
        className={cn(
          'flex relative items-center justify-start py-1 pl-5 pr-4 gap-3 w-full box-border shrink-0 mt-0.5',
          isSunset ? 'dk-sunset-sticky' : 'bg-bp-light-gray-4 dark:bg-bp-dark-gray-2',
          // The main checkout IS the repo header, so it is taller and pins to
          // the top; worktrees pin just beneath it while their contents scroll.
          isMain ? 'h-[55px] sticky top-0 z-20' : 'h-[45px] sticky top-[55px] z-10',
          expanded && 'shadow-[0_2px_6px_-1px_rgba(0,0,0,0.20)] dark:shadow-[0_2px_6px_-1px_rgba(0,0,0,0.6)]',
          deleting && 'opacity-50 pointer-events-none'
        )}
      >
        {/* The row itself is the toggle — no chevron. The repo name sits inside
            it too, so clicking the obvious part of the header works; the
            selector and the buttons stay outside. */}
        <div
          aria-expanded={expanded}
          className="overflow-hidden flex flex-1 text-left justify-start gap-4 items-center min-w-0 cursor-pointer self-stretch"
          onClick={onToggleExpanded}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;

            event.preventDefault();
            onToggleExpanded();
          }}
          role="button"
          tabIndex={0}
        >
          {leading}

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
              aria-label="Copy path"
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
                aria-label={`Open in ${selectedEditor.editor}`}
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
                aria-label={`Open in ${selectedShell.shell}`}
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
                aria-label="Remove worktree"
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
            isSunset ? 'dk-sunset-body' : 'bg-bp-light-gray-3 dark:bg-bp-dark-gray-1',
            'shadow-[inset_0_3px_6px_-2px_rgba(0,0,0,0.18)] dark:shadow-[inset_0_3px_6px_-2px_rgba(0,0,0,0.55)]'
          )}
        >
          {/* The card's own folds ride along in the last group's chip row: on
              their own they were four stacked rules eating half the card. */}
          {visibleOwn.map((group, index) =>
            renderGroup(group, index, index === visibleOwn.length - 1 ? cardChips : undefined)
          )}

          {visibleOwn.length === 0 && cardChips && <FoldBar>{cardChips}</FoldBar>}
          <Collapse isOpen={showAllOwn}>{hiddenOwn.map((group, index) => renderGroup(group, index))}</Collapse>
          <Collapse isOpen={showStray}>{stray.map((group, index) => renderGroup(group, index))}</Collapse>

          {showHidden && hiddenRuns.length > 0 && (
            <div className="mx-2 rounded-md [&>*]:mt-0 opacity-70">
              <GroupRuns
                onRefresh={onRefresh}
                project={project}
                runs={hiddenRuns}
                stickyTop={isMain ? 55 : 100}
              />
            </div>
          )}

          {gitHubToken && isBlank && (
            <div className={cn('flex justify-between items-center py-2.5 px-4 text-xs', Classes.TEXT_MUTED)}>
              <span>
                No pull requests or actions for <b>{worktree.branch}</b> in the last 24 hours
              </span>

              <Tag minimal>watcher is active</Tag>
            </div>
          )}
        </div>
      </Collapse>
    </>
  );
};
