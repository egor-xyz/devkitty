import { Collapse } from '@blueprintjs/core';
import { type FC, useState } from 'react';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { type Run } from 'types/gitHub';
import { type Project } from 'types/project';

import { splitDoneRuns } from '../../hooks/useRepoData/groupByBranch';
import { FoldDivider } from '../FoldDivider';
import { Workflow } from '../Workflow';

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
  const { gitHubActions } = useAppSettings();
  const { active, done, pinned } = splitDoneRuns(runs, gitHubActions.pinnedWorkflows);

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
      {active.map(row)}

      {done.length > 0 && (
        <FoldDivider
          hideLabel={`Hide ${done.length} successful check${done.length > 1 ? 's' : ''}`}
          onToggle={() => setShowDone((prev) => !prev)}
          open={showDone}
          showLabel={`Show ${done.length} successful check${done.length > 1 ? 's' : ''}`}
        />
      )}

      <Collapse isOpen={showDone}>{done.map(row)}</Collapse>
    </>
  );
};
