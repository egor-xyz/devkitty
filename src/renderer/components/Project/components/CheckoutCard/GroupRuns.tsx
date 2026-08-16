import { Classes } from '@blueprintjs/core';
import { type FC, useState } from 'react';
import { cn } from 'renderer/utils/cn';
import { type Run } from 'types/gitHub';
import { type Project } from 'types/project';

import { splitDoneRuns } from '../../hooks/useRepoData/groupByBranch';
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
  const { active, done } = splitDoneRuns(runs);

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
      {active.map(row)}

      {done.length > 0 && (
        <button
          className={cn(
            'flex items-center gap-3 w-full py-1.5 px-4 cursor-pointer select-none',
            'bg-transparent border-none',
            'hover:bg-bp-light-gray-4 dark:hover:bg-bp-dark-gray-2',
            Classes.TEXT_MUTED
          )}
          onClick={() => setShowDone((prev) => !prev)}
          type="button"
        >
          <span className="flex-1 h-px bg-bp-light-gray-1 dark:bg-bp-dark-gray-4" />

          <span className="text-[11px] whitespace-nowrap">
            {showDone ? 'Hide' : 'Show'} {done.length} successful check{done.length > 1 ? 's' : ''}
          </span>

          <span className="flex-1 h-px bg-bp-light-gray-1 dark:bg-bp-dark-gray-4" />
        </button>
      )}

      {showDone && done.map(row)}
    </>
  );
};
