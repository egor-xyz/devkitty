import { Button, Collapse, Icon } from '@blueprintjs/core';
import { type FC, useState } from 'react';
import { getStatusIcon } from 'rendered/assets/gitHubStatusUtils';
import { type Run } from 'types/gitHub';
import { type Project } from 'types/project';

import { ButtonGroup, JobHeader, JobItem, JobsList, JobStep, MainBlock, Root, Status, Title, TitleDescription, TitleMain } from './Workflow.styles';

type Props = {
  project: Project;
  run: Run;
};

const tagLength = 75;

export const Workflow: FC<Props> = ({ project, run }) => {
  const { conclusion, display_title, event, head_branch, html_url, id, name, run_number, status } = run;
  const Icon = getStatusIcon(conclusion || status);
  const [isOpen, setIsOpen] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Set<number>>(new Set());

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
            <Icon />
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

        <ButtonGroup>
          <Button
            icon={isOpen ? 'chevron-up' : 'chevron-down'}
            loading={loading}
            minimal
            onClick={toggleJobs}
            small
            title="Show jobs"
          />

          <Button
            icon="globe"
            minimal
            onClick={openInBrowser}
            small
            title="Open in browser"
          />
        </ButtonGroup>
      </Root>

      <Collapse isOpen={isOpen}>
        <JobsList>
          {jobs.map((job) => {
            const JobIcon = getStatusIcon(job.conclusion || job.status);
            const isJobExpanded = expandedJobs.has(job.id);
            return (
              <JobItem key={job.id}>
                <JobHeader onClick={() => toggleJobExpanded(job.id)}>
                  <Icon icon={isJobExpanded ? 'chevron-down' : 'chevron-right'} />
                  <span>{job.name}</span>
                </JobHeader>
                {isJobExpanded && (
                  <div style={{ paddingLeft: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', fontSize: '12px' }}>
                      <JobIcon />
                      <span style={{ fontWeight: 500 }}>Status</span>
                    </div>
                    {job.steps && job.steps.length > 0 && (
                      <div style={{ marginTop: '4px' }}>
                        {job.steps.map((step: any, idx: number) => {
                          const StepIcon = getStatusIcon(step.conclusion || step.status);
                          return (
                            <JobStep key={idx}>
                              <StepIcon />
                              <span>{step.name}</span>
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
