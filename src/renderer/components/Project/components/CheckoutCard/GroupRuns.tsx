import { type FC, type ReactNode, useState } from 'react';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { useFilter } from 'renderer/hooks/useFilter';
import { type Run } from 'types/gitHub';
import { type Project } from 'types/project';

import { overflowLimit, splitDoneRuns } from '../../hooks/useRepoData/groupByBranch';
import { FoldBar, FoldChip } from '../FoldBar';
import { Workflow } from '../Workflow';

const pageSize = 50;

type Props = {
  // Chips the card wants to share this row — its own folds would otherwise
  // stack another rule under this one.
  footer?: ReactNode;
  // Where this list renders, so a run's hide menu can scope to root vs worktree.
  isRoot?: boolean;
  limit?: number;
  loadingOlder?: boolean;
  moreHistory?: boolean;
  onLoadOlder?: () => Promise<void> | void;
  onRefresh: () => void;
  // A pull request shows every check it has — capping them is what the passing
  // fold is for. Paging belongs to a branch's open-ended run history.
  paged?: boolean;
  project: Project;
  runs: Run[];
  stickyTop?: number;
};

// Runs that finished cleanly are folded away behind a chip: what needs
// attention stays on screen, the rest is one click away.
export const GroupRuns: FC<Props> = ({
  footer,
  isRoot = false,
  limit,
  loadingOlder,
  moreHistory,
  onLoadOlder,
  onRefresh,
  paged = true,
  project,
  runs,
  stickyTop
}) => {
  const [showDone, setShowDone] = useState(false);
  const [donePage, setDonePage] = useState(pageSize);
  const { gitHubActions } = useAppSettings();
  const { query } = useFilter();
  const { active, done, pinned } = splitDoneRuns(runs, gitHubActions.pinnedWorkflows);

  // How many runs a page of the active list holds. Loading more grows it a page
  // at a time, with no ceiling; hiding drops back to exactly one page.
  const step = paged ? (limit ?? overflowLimit) : Number.MAX_SAFE_INTEGER;
  const [activePage, setActivePage] = useState(step);
  const shownActive = active.slice(0, Math.max(activePage, step));
  const remainingActive = active.length - shownActive.length;

  // A busy branch can settle hundreds of green runs in a day. Opening the fold
  // renders a page of them, not the lot.
  const shownDone = done.slice(0, donePage);
  const remainingDone = done.length - shownDone.length;

  const toggleDone = () => {
    setShowDone((prev) => !prev);
    setDonePage(pageSize);
  };

  const row = (run: Run) => (
    <Workflow
      isRoot={isRoot}
      key={run.id}
      onRefresh={onRefresh}
      project={project}
      run={run}
      stickyTop={stickyTop}
    />
  );

  // Filtering already narrowed these runs to the ones you asked for, so folding
  // the successful ones away would hide the answer.
  if (query.trim()) return <>{runs.map(row)}</>;

  const chips = (
    <>
      {remainingActive > 0 && (
        <FoldChip
          icon="double-chevron-down"
          label="Load more"
          onToggle={() => setActivePage((prev) => Math.max(prev, step) + step)}
        />
      )}

      {shownActive.length > step && (
        <FoldChip
          icon="double-chevron-up"
          label="Hide"
          onToggle={() => setActivePage(step)}
        />
      )}

      {/* The root card omits the "Passing checks" fold — its finished runs are
          already reachable through History. Per-branch groups keep it. */}
      {done.length > 0 && !isRoot && (
        <FoldChip
          icon="tick-circle"
          label="Passing checks"
          onToggle={toggleDone}
        />
      )}

      {showDone && remainingDone > 0 && (
        <FoldChip
          icon="double-chevron-down"
          label={`${remainingDone} more passing`}
          onToggle={() => setDonePage((prev) => prev + pageSize)}
        />
      )}

      {/* Older runs are nearly all finished ones, so they land in the passing
          pile: fetching a page and leaving that pile folded would look like the
          click did nothing. Open it as the runs arrive. */}
      {paged && moreHistory && onLoadOlder && (
        <FoldChip
          icon="history"
          label={loadingOlder ? 'Loading…' : 'History'}
          onToggle={async () => {
            await onLoadOlder();
            setShowDone(true);
          }}
        />
      )}

      {footer}
    </>
  );

  const hasChips = Boolean(
    remainingActive > 0 ||
      shownActive.length > step ||
      done.length > 0 ||
      (paged && moreHistory && onLoadOlder) ||
      footer
  );

  return (
    <>
      {/* Rendered directly, not through Collapse: these lists run to dozens of
          rows and a poll landing mid-animation makes Collapse remeasure, which
          flickers and drags the scroll position with it. */}
      {pinned.map(row)}
      {shownActive.map(row)}
      {hasChips && <FoldBar>{chips}</FoldBar>}
      {showDone && shownDone.map(row)}
    </>
  );
};
