import { Button, ButtonGroup, Collapse, Menu, MenuDivider, MenuItem, Popover, Tooltip } from '@blueprintjs/core';
import { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import { getStatusIcon } from 'renderer/assets/gitHubStatusUtils';
import { useAppSettings, useIsSunset } from 'renderer/hooks/useAppSettings';
import { useModal } from 'renderer/hooks/useModal';
import { cn } from 'renderer/utils/cn';
import { timeAgo } from 'renderer/utils/timeAgo';
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
  onRefresh?: () => void;
  project: Project;
  run: Run;
  // Where this row pins once its jobs are open: below main, or below the
  // worktree header that is itself pinned below main.
  stickyTop?: number;
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

export const Workflow: FC<Props> = ({ onRefresh, project, run, stickyTop = 55 }) => {
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
  const { gitHubActions, set } = useAppSettings();
  const isSunset = useIsSunset();
  const pinnedWorkflows = gitHubActions.pinnedWorkflows ?? [];
  const isPinned = pinnedWorkflows.includes(path);

  const ignoredWorkflows = gitHubActions.ignoredWorkflows ?? [];

  const hideWorkflow = () => {
    if (ignoredWorkflows.includes(path)) return;

    set({ gitHubActions: { ...gitHubActions, ignoredWorkflows: [...ignoredWorkflows, path] } });
  };

  const togglePinned = () => {
    set({
      gitHubActions: {
        ...gitHubActions,
        pinnedWorkflows: isPinned ? pinnedWorkflows.filter((item) => item !== path) : [...pinnedWorkflows, path]
      }
    });
  };

  const [isOpen, setIsOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);

  // GitHub's workflow-run status can lag behind the actual state of jobs
  // (e.g. still reporting "waiting" or "queued" while jobs are already executing
  // or have even completed). When we have job data, prefer it over run.status.
  const effectiveStatus = useMemo(() => {
    if (conclusion) return conclusion;
    if (jobs.some((j) => j.status === 'in_progress' || j.conclusion)) return 'in_progress';
    return status;
  }, [conclusion, status, jobs]);
  const StatusIcon = getStatusIcon(effectiveStatus);
  const isRunning = !conclusion && (effectiveStatus === 'in_progress' || effectiveStatus === 'queued' || effectiveStatus === 'pending' || effectiveStatus === 'waiting');
  const hasFailed = conclusion === 'failure' || conclusion === 'timed_out' || conclusion === 'cancelled';
  const [, setLoading] = useState(false);
  const [, setRefresh] = useState(0);

  // Only tick the duration timer while the workflow is still running
  useEffect(() => {
    if (conclusion) return;

    const timer = window.setInterval(() => {
      setRefresh((prev) => prev + 1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [conclusion]);
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
    if (!isOpen || jobs.length === 0) return;

    const pollJobs = async () => {
      const res = await window.bridge.gitAPI.getJobs(project.id, id);
      if (res.success && res.jobs) {
        setJobs(res.jobs);

        // If all jobs are done but the workflow run hasn't updated yet, trigger a refresh
        if (!conclusion && res.jobs.length > 0 && res.jobs.every((j: Job) => j.conclusion)) {
          onRefresh?.();
        }
      }
    };

    // Final fetch when workflow completes to get final job/step statuses
    if (conclusion) {
      pollJobs();
      return;
    }

    let jobPollTimer: null | number = null;

    const startJobPolling = () => {
      if (!jobPollTimer) {
        jobPollTimer = window.setInterval(pollJobs, 5000);
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
  }, [isOpen, jobs.length, id, project.id, conclusion, onRefresh]);

  return (
    <>
      <div
        aria-expanded={isOpen}
        className={cn(
          // pr-2, not pr-4: the group around this row is inset by mx-2, so the
          // buttons still line up with the checkout row's buttons above.
          'flex relative items-center justify-between min-h-[45px] py-1 pl-5 pr-2 gap-2 w-full box-border shrink-0 mt-0.5 cursor-pointer hover:opacity-90',
          // With its jobs open the run is a header in its own right: it pins
          // under the checkout above it so you keep sight of which run you are
          // reading a long job list for. Opaque only while pinned, so nothing
          // scrolling beneath bleeds through; otherwise translucent glass.
          isSunset
            ? isOpen
              ? 'sticky z-[5] dk-sunset-sticky'
              : 'dk-sunset-row'
            : cn('bg-bp-light-gray-4 dark:bg-bp-dark-gray-2', isOpen && 'sticky z-[5]')
        )}
        onClick={toggleJobs}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;

          event.preventDefault();
          toggleJobs();
        }}
        role="button"
        style={isOpen ? { top: stickyTop } : undefined}
        tabIndex={0}
      >
        <div className="overflow-hidden flex text-left justify-start gap-4 items-center flex-1 min-w-0">
          <div className="w-[30px] shrink-0 flex justify-center"
            title={effectiveStatus}
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
          <div className="flex flex-col items-end text-[11px] text-bp-gray-2 dark:text-bp-gray-4 ml-2 whitespace-nowrap shrink-0">
            <span>{runDuration}</span>

            {/* How long it took answers "is this slow"; when it ended answers
                "is this the deploy I am thinking of". */}
            {conclusion && (
              <Tooltip content={new Date(updated_at).toLocaleString()}>
                <span className="font-light">{timeAgo(updated_at)}</span>
              </Tooltip>
            )}
          </div>
        ) : null}

        <ButtonGroup onClick={(e) => e.stopPropagation()}>
          <Tooltip compact
            content={copied ? 'Copied!' : 'Copy link'}
            hoverOpenDelay={copied ? 0 : 500}
            placement="bottom"
          >
            <Button
              aria-label="Copy run link"
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
              aria-label="Open run in browser"
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

                <MenuItem
                  icon={isPinned ? 'unpin' : 'pin'}
                  onClick={togglePinned}
                  text={isPinned ? 'Unpin workflow' : 'Pin workflow'}
                />

                {/* Hiding one run of a workflow that runs on every push buys
                    nothing — the next one is back in a minute. Hiding is
                    per workflow, and Settings lists it for undoing. */}
                <MenuItem
                  icon="eye-off"
                  intent="warning"
                  onClick={hideWorkflow}
                  text="Hide this workflow"
                />
              </Menu>
            }
            placement="bottom-end"
          >
            <Button aria-label="Run actions"
              icon="caret-down"
            />
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
