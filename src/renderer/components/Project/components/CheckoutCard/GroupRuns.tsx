import { type FC, useState } from 'react';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { useFilter } from 'renderer/hooks/useFilter';
import { type Run } from 'types/gitHub';
import { type Project } from 'types/project';

import { overflowLimit, splitDoneRuns } from '../../hooks/useRepoData/groupByBranch';
import { FoldDivider } from '../FoldDivider';
import { Workflow } from '../Workflow';

const pageSize = 50;

type Props = {
  limit?: number;
  onRefresh: () => void;
  project: Project;
  runs: Run[];
  stickyTop?: number;
};

// Runs that finished cleanly are folded away behind a divider: what needs
// attention stays on screen, the rest is one click away.
export const GroupRuns: FC<Props> = ({ limit, onRefresh, project, runs, stickyTop }) => {
  const [showDone, setShowDone] = useState(false);
  const [donePage, setDonePage] = useState(pageSize);
  const { gitHubActions } = useAppSettings();
  const { query } = useFilter();
  const { active, done, pinned } = splitDoneRuns(runs, gitHubActions.pinnedWorkflows);

  // How many runs a page of the active list holds. Loading more grows it a page
  // at a time, with no ceiling; hiding drops back to exactly one page.
  const step = limit ?? overflowLimit;
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

  return (
    <>
      {/* Rendered directly, not through Collapse: these lists run to dozens of
          rows and a poll landing mid-animation makes Collapse remeasure, which
          flickers and drags the scroll position with it. */}
      {pinned.map(row)}
      {shownActive.map(row)}

      {remainingActive > 0 && (
        <FoldDivider
          hideLabel={`Load ${Math.min(remainingActive, step)} more of ${remainingActive}`}
          onToggle={() => setActivePage((prev) => Math.max(prev, step) + step)}
          open={false}
          showLabel={`Load ${Math.min(remainingActive, step)} more of ${remainingActive}`}
        />
      )}

      {shownActive.length > step && (
        <FoldDivider
          hideLabel={`Hide ${shownActive.length - step} check${shownActive.length - step > 1 ? 's' : ''}`}
          onToggle={() => setActivePage(step)}
          open
          showLabel={`Hide ${shownActive.length - step} check${shownActive.length - step > 1 ? 's' : ''}`}
        />
      )}

      {done.length > 0 && (
        <FoldDivider
          hideLabel={`Hide ${done.length} successful check${done.length > 1 ? 's' : ''}`}
          onToggle={toggleDone}
          open={showDone}
          showLabel={`Show ${done.length} successful check${done.length > 1 ? 's' : ''}`}
        />
      )}

      {showDone && (
        <>
          {shownDone.map(row)}

          {remainingDone > 0 && (
            <FoldDivider
              hideLabel={`Load ${Math.min(remainingDone, pageSize)} more of ${remainingDone}`}
              onToggle={() => setDonePage((prev) => prev + pageSize)}
              open={false}
              showLabel={`Load ${Math.min(remainingDone, pageSize)} more of ${remainingDone}`}
            />
          )}
        </>
      )}
    </>
  );
};
