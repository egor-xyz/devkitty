import { Icon as BPIcon, Button, Collapse } from '@blueprintjs/core';
import { type FC, useEffect, useState } from 'react';
import { getStatusIcon } from 'rendered/assets/gitHubStatusUtils';
import { type Run } from 'types/gitHub';
import { type Project } from 'types/project';

import {
  ButtonGroup,
  JobHeader,
  JobHeaderContent,
  JobItem,
  JobsList,
  JobStep,
  JobStepContent,
  MainBlock,
  Root,
  Status,
  TimeText,
  Title,
  TitleDescription,
  TitleMain
} from './Workflow.styles';

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

export const Workflow: FC<Props> = ({ project, run }) => {
  const {
    conclusion,
    created_at,
    display_title,
    event,
    head_branch,
    html_url,
    id,
    name,
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
      <Root>
        <MainBlock>
          <Status title={conclusion || status}>
            <StatusIcon />
          </Status>

          <Title>
            <TitleMain>
              <b>{name}</b>
              {': '}
              {event !== 'workflow_dispatch' ? event : 'manual'}
              {' » '}
              {head_branch.length > tagLength ? `${head_branch.slice(0, tagLength)}...` : head_branch}
              {' (#'}
              {run_number}
              {')'}
            </TitleMain>

            <TitleDescription>{display_title}</TitleDescription>
          </Title>
        </MainBlock>

        {runDuration ? <TimeText>{runDuration}</TimeText> : null}

        <ButtonGroup>
          <Button
            icon="globe"
            minimal
            onClick={openInBrowser}
            small
            title="Open in browser"
          />

          <Button
            icon={isOpen ? 'chevron-up' : 'chevron-down'}
            loading={loading}
            minimal
            onClick={toggleJobs}
            small
            title="Show jobs"
          />
        </ButtonGroup>
      </Root>

      <Collapse isOpen={isOpen}>
        <JobsList>
          {jobs.map((job) => {
            const JobIcon = getStatusIcon(job.conclusion || job.status);
            const isJobExpanded = expandedJobs.has(job.id);
            const jobDuration = formatDuration(job.started_at, job.completed_at);
            return (
              <JobItem key={job.id}>
                <JobHeader onClick={() => toggleJobExpanded(job.id)}>
                  <JobHeaderContent>
                    <BPIcon icon={isJobExpanded ? 'chevron-down' : 'chevron-right'} />
                    <JobIcon />
                    <span>{job.name}</span>
                  </JobHeaderContent>

                  {jobDuration ? <TimeText>{jobDuration}</TimeText> : null}
                </JobHeader>

                {isJobExpanded && (
                  <div style={{ paddingLeft: '10px' }}>
                    {job.steps && job.steps.length > 0 && (
                      <div style={{ marginTop: '4px' }}>
                        {job.steps.map((step) => {
                          const StepIcon = getStatusIcon(step.conclusion || step.status);
                          const stepDuration = formatDuration(step.started_at, step.completed_at);
                          return (
                            <JobStep key={`${job.id}-step-${step.name}`}>
                              <JobStepContent>
                                <StepIcon />
                                <span>{step.name}</span>
                              </JobStepContent>

                              {stepDuration ? <TimeText>{stepDuration}</TimeText> : null}
                            </JobStep>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </JobItem>
            );
          })}
        </JobsList>
      </Collapse>
    </>
  );
};
