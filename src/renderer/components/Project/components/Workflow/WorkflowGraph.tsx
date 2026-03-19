import { Icon as BPIcon } from '@blueprintjs/core';
import { type FC, useEffect, useRef, useState } from 'react';
import { getStatusIcon } from 'renderer/assets/gitHubStatusUtils';
import { cn } from 'renderer/utils/cn';

type Column = Job[];

type Job = {
  completed_at?: string;
  conclusion?: string;
  id: number;
  name: string;
  started_at?: string;
  status?: string;
  steps?: Step[];
};

type Props = {
  formatDuration: (start?: string, end?: string) => null | string;
  jobs: Job[];
};

type Step = {
  completed_at?: string;
  conclusion?: string;
  name: string;
  started_at?: string;
  status?: string;
};

const groupJobsIntoColumns = (jobs: Job[]): Column[] => {
  if (jobs.length === 0) return [];

  const sorted = [...jobs].sort((a, b) => {
    const aStart = a.started_at ? new Date(a.started_at).getTime() : Infinity;
    const bStart = b.started_at ? new Date(b.started_at).getTime() : Infinity;
    return aStart - bStart;
  });

  const columns: Column[] = [];
  const assigned = new Set<number>();

  for (const job of sorted) {
    if (assigned.has(job.id)) continue;

    // Find which column this job belongs to
    let placed = false;
    for (const col of columns) {
      // Check if this job overlaps with any job in this column
      const colLatestEnd = Math.max(
        ...col.map((j) => (j.completed_at ? new Date(j.completed_at).getTime() : Date.now()))
      );
      const colEarliestStart = Math.min(
        ...col.map((j) => (j.started_at ? new Date(j.started_at).getTime() : Infinity))
      );
      const jobStart = job.started_at ? new Date(job.started_at).getTime() : Infinity;

      // Job started while column jobs were still running — it's parallel
      if (jobStart >= colEarliestStart && jobStart < colLatestEnd + 2000) {
        col.push(job);
        assigned.add(job.id);
        placed = true;
        break;
      }
    }

    if (!placed) {
      columns.push([job]);
      assigned.add(job.id);
    }
  }

  return columns;
};

const JobCard: FC<{
  formatDuration: (start?: string, end?: string) => null | string;
  job: Job;
}> = ({ formatDuration, job }) => {
  const JobIcon = getStatusIcon(job.conclusion || job.status);
  const duration = formatDuration(job.started_at, job.completed_at);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          'flex items-center gap-2 py-2 px-3 rounded border cursor-pointer select-none justify-between min-w-[140px]',
          'border-bp-light-gray-1 dark:border-bp-dark-gray-4',
          'bg-white dark:bg-bp-dark-gray-3 hover:opacity-80'
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          {job.steps?.length > 0 && (
            <BPIcon
              className="shrink-0 opacity-50"
              icon={expanded ? 'chevron-down' : 'chevron-right'}
              size={12}
            />
          )}

          <div className="shrink-0">
            <JobIcon />
          </div>

          <span className="overflow-hidden text-ellipsis whitespace-nowrap text-xs font-medium">
            {job.name}
          </span>
        </div>

        {duration && (
          <span className="text-[11px] text-bp-gray-2 dark:text-bp-gray-4 ml-2 whitespace-nowrap shrink-0">
            {duration}
          </span>
        )}
      </div>

      {expanded && job.steps?.length > 0 && (
        <div className="ml-3 mt-1 mb-1 border-l border-bp-light-gray-1 dark:border-bp-dark-gray-4 pl-2">
          {job.steps.map((step) => {
            const StepIcon = getStatusIcon(step.conclusion || step.status);
            const stepDuration = formatDuration(step.started_at, step.completed_at);
            return (
              <div
                className="flex items-center gap-1.5 py-1 px-1 text-[11px] font-light dark:text-bp-gray-4 justify-between"
                key={`${job.id}-${step.name}`}
              >
                <div className="flex items-center gap-1.5 min-w-0 overflow-hidden [&>svg]:w-3 [&>svg]:h-3 [&>svg]:shrink-0">
                  <StepIcon />
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">{step.name}</span>
                </div>

                {stepDuration && (
                  <span className="text-[10px] text-bp-gray-2 dark:text-bp-gray-4 ml-2 whitespace-nowrap shrink-0">
                    {stepDuration}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Connector: FC<{
  containerRef: React.RefObject<HTMLDivElement>;
  fromRef: React.RefObject<HTMLDivElement>;
  toRef: React.RefObject<HTMLDivElement>;
}> = ({ containerRef, fromRef, toRef }) => {
  const [path, setPath] = useState('');

  useEffect(() => {
    const update = () => {
      if (!fromRef.current || !toRef.current || !containerRef.current) return;
      const container = containerRef.current.getBoundingClientRect();
      const from = fromRef.current.getBoundingClientRect();
      const to = toRef.current.getBoundingClientRect();

      const x1 = from.right - container.left;
      const y1 = from.top + from.height / 2 - container.top;
      const x2 = to.left - container.left;
      const y2 = to.top + to.height / 2 - container.top;
      const midX = (x1 + x2) / 2;

      setPath(`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
    };

    update();
    const observer = new ResizeObserver(update);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [fromRef, toRef, containerRef]);

  if (!path) return null;

  return (
    <path
      d={path}
      fill="none"
      stroke="currentColor"
      strokeOpacity={0.25}
      strokeWidth={1.5}
    />
  );
};

export const WorkflowGraph: FC<Props> = ({ formatDuration, jobs }) => {
  const columns = groupJobsIntoColumns(jobs);
  const containerRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<Map<number, React.RefObject<HTMLDivElement>>>(new Map());

  // Create refs for each column
  const getColRef = (colIdx: number) => {
    if (!colRefs.current.has(colIdx)) {
      colRefs.current.set(colIdx, { current: null });
    }
    return colRefs.current.get(colIdx)!;
  };

  // Build connector pairs between adjacent columns
  const connectorPairs: { from: number; to: number }[] = [];
  for (let i = 0; i < columns.length - 1; i++) {
    connectorPairs.push({ from: i, to: i + 1 });
  }

  return (
    <div
      className="relative overflow-x-auto py-3 pl-5 pr-4 bg-bp-light-gray-5 dark:bg-bp-dark-gray-1 w-full box-border"
      ref={containerRef}
    >
      <div className="flex items-start gap-6 min-w-min">
        {columns.map((col, colIdx) => (
          <div
            className="flex flex-col gap-2 shrink-0"
            key={colIdx}
            ref={getColRef(colIdx)}
          >
            {col.map((job) => (
              <JobCard
                formatDuration={formatDuration}
                job={job}
                key={job.id}
              />
            ))}
          </div>
        ))}
      </div>

      <svg
        className="absolute top-0 left-0 w-full h-full pointer-events-none text-bp-gray-2 dark:text-bp-gray-4"
        style={{ overflow: 'visible' }}
      >
        {connectorPairs.map(({ from, to }) => (
          <Connector
            containerRef={containerRef}
            fromRef={getColRef(from)}
            key={`${from}-${to}`}
            toRef={getColRef(to)}
          />
        ))}
      </svg>
    </div>
  );
};
