import { Icon as BPIcon, Button, ButtonGroup, Collapse, Tooltip } from '@blueprintjs/core';
import { type FC, useEffect, useState } from 'react';
import { getStatusIcon } from 'renderer/assets/gitHubStatusUtils';
import { cn } from 'renderer/utils/cn';
import { type Run } from 'types/gitHub';
import { type Project } from 'types/project';

type Job = {
  completed_at?: string;
  conclusion?: string;
  id: number;
  name: string;
  started_at?: string;
  status?: string;
  steps?: { completed_at?: string; conclusion?: string; name: string; started_at?: string; status?: string }[];
};

type Props = {
  onHide?: (runId: number, runName: string) => void;
  onIgnore?: (workflowName: string, workflowPath: string) => void;
  project: Project;
  run: Run;
};

const tagLength = 75;

const formatDuration = (start?: string, end?: string) => {
  if (!start) return null;
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return null;
  const totalSeconds = Math.floor((endMs - startMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

export const Workflow: FC<Props> = ({ onHide, onIgnore, project, run }) => {
  const {
    conclusion,
    created_at,
    display_title,
    event,
    head_branch,
    html_url,
    id,
    name,
    path,
    run_number,
    status,
    updated_at
  } = run;
  const StatusIcon = getStatusIcon(conclusion || status);
  const [isOpen, setIsOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Set<number>>(new Set());
  const [, setRefresh] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRefresh((prev) => prev + 1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);
  const runDuration = formatDuration(created_at, conclusion ? updated_at : undefined);

  const openInBrowser = () => {
    window.open(html_url, '_blank');
  };

  const toggleJobs = async () => {
    if (!isOpen && jobs.length === 0) {
      setLoading(true);
      const res = await window.bridge.gitAPI.getJobs(project.id, id);
      if (res.success && res.jobs) {
        setJobs(res.jobs);
      }
      setLoading(false);
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen || jobs.length === 0 || conclusion) return;

    const pollJobs = async () => {
      const res = await window.bridge.gitAPI.getJobs(project.id, id);
      if (res.success && res.jobs) {
        setJobs(res.jobs);
      }
    };

    let jobPollTimer: null | number = null;

    const startJobPolling = () => {
      if (!jobPollTimer) {
        jobPollTimer = window.setInterval(pollJobs, 10000);
      }
    };

    const stopJobPolling = () => {
      if (jobPollTimer) {
        window.clearInterval(jobPollTimer);
        jobPollTimer = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopJobPolling();
      } else {
        pollJobs();
        startJobPolling();
      }
    };

    startJobPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopJobPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen, jobs.length, id, project.id, conclusion]);

  const toggleJobExpanded = (jobId: number) => {
    const newExpanded = new Set(expandedJobs);
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId);
    } else {
      newExpanded.add(jobId);
    }
    setExpandedJobs(newExpanded);
  };

  return (
    <>
      <div
        className={cn(
          'flex relative items-center justify-between min-h-[45px] py-1 pl-5 pr-4 gap-2 w-full box-border shrink-0 mt-0.5 cursor-pointer',
          'bg-bp-light-gray-4 dark:bg-bp-dark-gray-2 hover:opacity-90'
        )}
        onClick={toggleJobs}
      >
        <div className="overflow-hidden flex text-left justify-start gap-4 items-center flex-1 min-w-0">
          <div className="w-[30px] shrink-0 flex justify-center"
            title={conclusion || status}
          >
            <StatusIcon />
          </div>

          <div className="overflow-hidden flex flex-col">
            <div className="overflow-hidden text-ellipsis whitespace-nowrap">
              <b>{name}</b>
              {': '}
              {event !== 'workflow_dispatch' ? event : 'manual'}
              {' » '}
              {head_branch.length > tagLength ? `${head_branch.slice(0, tagLength)}...` : head_branch}
              {' (#'}
              {run_number}
              {')'}
            </div>

            <div className="overflow-hidden whitespace-nowrap text-ellipsis -mt-0.5 text-[11px] font-light dark:text-bp-gray-3">
              {display_title}
            </div>
          </div>
        </div>

        {runDuration ? (
          <span className="text-[11px] text-bp-gray-2 dark:text-bp-gray-4 ml-2 whitespace-nowrap shrink-0">
            {runDuration}
          </span>
        ) : null}

        <ButtonGroup onClick={(e) => e.stopPropagation()}>
          {onIgnore && (
            <Tooltip compact
              content="Ignore workflow"
              hoverOpenDelay={500}
              placement="bottom"
            >
              <Button
                icon="disable"
                onClick={() => onIgnore(name, path)}
              />
            </Tooltip>
          )}

          {onHide && (
            <Tooltip compact
              content="Hide this action"
              hoverOpenDelay={500}
              placement="bottom"
            >
              <Button
                icon="eye-off"
                onClick={() => onHide(id, display_title)}
              />
            </Tooltip>
          )}

          <Tooltip compact
            content="Open in browser"
            hoverOpenDelay={500}
            placement="bottom"
          >
            <Button
              icon="globe"
              onClick={openInBrowser}
            />
          </Tooltip>
        </ButtonGroup>
      </div>

      <Collapse isOpen={isOpen}>
        <div className="py-2 pl-5 pr-4 bg-bp-light-gray-5 dark:bg-bp-dark-gray-1 w-full box-border">
          {jobs.map((job) => {
            const JobIcon = getStatusIcon(job.conclusion || job.status);
            const isJobExpanded = expandedJobs.has(job.id);
            const jobDuration = formatDuration(job.started_at, job.completed_at);
            return (
              <div
                className="p-0 m-0 bg-transparent text-xs"
                key={job.id}
              >
                <div
                  className={cn(
                    'flex items-center gap-1.5 py-2 px-2.5 cursor-pointer rounded my-1 select-none justify-between',
                    'bg-white dark:bg-bp-dark-gray-3 hover:opacity-80'
                  )}
                  onClick={() => toggleJobExpanded(job.id)}
                >
                  <div className="flex items-center gap-1.5 min-w-0 overflow-hidden [&>span]:overflow-hidden [&>span]:text-ellipsis [&>span]:whitespace-nowrap">
                    <BPIcon icon={isJobExpanded ? 'chevron-down' : 'chevron-right'} />
                    <JobIcon />
                    <span>{job.name}</span>
                  </div>

                  {jobDuration ? (
                    <span className="text-[11px] text-bp-gray-2 dark:text-bp-gray-4 ml-2 whitespace-nowrap shrink-0">
                      {jobDuration}
                    </span>
                  ) : null}
                </div>

                {isJobExpanded && (
                  <div style={{ paddingLeft: '10px' }}>
                    {job.steps && job.steps.length > 0 && (
                      <div style={{ marginTop: '4px' }}>
                        {job.steps.map((step) => {
                          const StepIcon = getStatusIcon(step.conclusion || step.status);
                          const stepDuration = formatDuration(step.started_at, step.completed_at);
                          return (
                            <div
                              className={cn(
                                'flex items-center gap-2 py-1.5 pl-9 pr-2.5 text-[11px] font-light my-0.5 rounded-sm justify-between',
                                'bg-white dark:bg-bp-dark-gray-3 dark:text-bp-gray-4',
                                '[&>svg]:w-3 [&>svg]:h-3 [&>svg]:shrink-0'
                              )}
                              key={`${job.id}-step-${step.name}`}
                            >
                              <div className="flex items-center gap-2 min-w-0 overflow-hidden [&>span]:overflow-hidden [&>span]:text-ellipsis [&>span]:whitespace-nowrap">
                                <StepIcon />
                                <span>{step.name}</span>
                              </div>

                              {stepDuration ? (
                                <span className="text-[11px] text-bp-gray-2 dark:text-bp-gray-4 ml-2 whitespace-nowrap shrink-0">
                                  {stepDuration}
                                </span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Collapse>
    </>
  );
};
