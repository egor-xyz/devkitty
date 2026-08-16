import { Collapse } from '@blueprintjs/core';
import { type FC, useState } from 'react';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { type Run } from 'types/gitHub';
import { type Project } from 'types/project';

import { splitDoneRuns, splitOverflow } from '../../hooks/useRepoData/groupByBranch';
import { FoldDivider } from '../FoldDivider';
import { Workflow } from '../Workflow';

const pageSize = 50;

type Props = {
  onHide: (runId: number) => void;
  onIgnore: (workflowName: string, workflowPath: string) => void;
  onRefresh: () => void;
  project: Project;
  runs: Run[];
};

// Runs that finished cleanly are folded away behind a divider: what needs
// attention stays on screen, the rest is one click away.
export const GroupRuns: FC<Props> = ({ onHide, onIgnore, onRefresh, project, runs }) => {
  const [showDone, setShowDone] = useState(false);
  const [showAllActive, setShowAllActive] = useState(false);
  const [donePage, setDonePage] = useState(pageSize);
  const { gitHubActions } = useAppSettings();
  const { active, done, pinned } = splitDoneRuns(runs, gitHubActions.pinnedWorkflows);

  // A busy branch can settle hundreds of green runs in a day. Opening the fold
  // renders a page of them, not the lot.
  const shownDone = done.slice(0, donePage);
  const remainingDone = done.length - shownDone.length;

  const toggleDone = () => {
    setShowDone((prev) => !prev);
    setDonePage(pageSize);
  };

  // A branch that fans out over a dozen jobs would otherwise push everything
  // below it off the screen, so the tail of the active list folds too.
  const { hidden: hiddenActive, visible: visibleActive } = splitOverflow(active);

  const row = (run: Run) => (
    <Workflow
      key={run.id}
      onHide={onHide}
      onIgnore={onIgnore}
      onRefresh={onRefresh}
      project={project}
      run={run}
    />
  );

  return (
    <>
      {pinned.map(row)}
      {visibleActive.map(row)}
      <Collapse isOpen={showAllActive}>{hiddenActive.map(row)}</Collapse>

      {hiddenActive.length > 0 && (
        <FoldDivider
          hideLabel={`Hide ${hiddenActive.length} more check${hiddenActive.length > 1 ? 's' : ''}`}
          onToggle={() => setShowAllActive((prev) => !prev)}
          open={showAllActive}
          showLabel={`Show ${hiddenActive.length} more check${hiddenActive.length > 1 ? 's' : ''}`}
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

      <Collapse isOpen={showDone}>
        {shownDone.map(row)}

        {remainingDone > 0 && (
          <FoldDivider
            hideLabel={`Load ${Math.min(remainingDone, pageSize)} more of ${remainingDone}`}
            onToggle={() => setDonePage((prev) => prev + pageSize)}
            open={false}
            showLabel={`Load ${Math.min(remainingDone, pageSize)} more of ${remainingDone}`}
          />
        )}
      </Collapse>
    </>
  );
};
