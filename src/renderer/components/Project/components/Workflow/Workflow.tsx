import { Button, ButtonGroup, Collapse, Menu, MenuDivider, MenuItem, Popover, Tooltip } from '@blueprintjs/core';
import { type FC, useCallback, useEffect, useState } from 'react';
import { getStatusIcon } from 'renderer/assets/gitHubStatusUtils';
import { useModal } from 'renderer/hooks/useModal';
import { cn } from 'renderer/utils/cn';
import { type Run } from 'types/gitHub';
import { type Project } from 'types/project';

import { WorkflowGraph } from './WorkflowGraph';

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
  onHide?: (runId: number) => void;
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
  const { openModal } = useModal();
  const StatusIcon = getStatusIcon(conclusion || status);
  const isRunning = !conclusion && (status === 'in_progress' || status === 'queued' || status === 'pending');
  const hasFailed = conclusion === 'failure' || conclusion === 'timed_out' || conclusion === 'cancelled';
  const [isOpen, setIsOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [, setLoading] = useState(false);
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

  const [copied, setCopied] = useState(false);
  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(html_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [html_url]);

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
          <Tooltip compact
            content={copied ? 'Copied!' : 'Copy link'}
            hoverOpenDelay={copied ? 0 : 500}
            placement="bottom"
          >
            <Button
              icon={copied ? 'tick' : 'link'}
              intent={copied ? 'success' : 'none'}
              onClick={copyLink}
            />
          </Tooltip>

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

          <Popover
            content={
              <Menu>
                {isRunning && (
                  <MenuItem
                    icon="stop"
                    intent="danger"
                    onClick={() => openModal({ name: 'workflow:action', props: { action: 'cancel', projectId: project.id, runId: id, runName: name } })}
                    text="Cancel"
                  />
                )}

                {!isRunning && (
                  <>
                    <MenuItem
                      icon="repeat"
                      onClick={() => openModal({ name: 'workflow:action', props: { action: 'rerun', projectId: project.id, runId: id, runName: name } })}
                      text="Re-run all jobs"
                    />

                    {hasFailed && (
                      <MenuItem
                        icon="warning-sign"
                        intent="warning"
                        onClick={() => openModal({ name: 'workflow:action', props: { action: 'rerun-failed', projectId: project.id, runId: id, runName: name } })}
                        text="Re-run failed jobs"
                      />
                    )}
                  </>
                )}

                <MenuDivider />

                {onHide && (
                  <MenuItem
                    icon="eye-off"
                    onClick={() => onHide(id)}
                    text="Hide this action"
                  />
                )}

                {onIgnore && (
                  <MenuItem
                    icon="disable"
                    intent="warning"
                    onClick={() => onIgnore(name, path)}
                    text="Ignore workflow"
                  />
                )}
              </Menu>
            }
            placement="bottom-end"
          >
            <Button icon="caret-down" />
          </Popover>
        </ButtonGroup>
      </div>

      <Collapse isOpen={isOpen}>
        <WorkflowGraph
          formatDuration={formatDuration}
          jobs={jobs}
        />
      </Collapse>
    </>
  );
};
