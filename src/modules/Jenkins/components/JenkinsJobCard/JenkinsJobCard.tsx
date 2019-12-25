import { FC, useMemo } from 'react';
import { Button, ButtonGroup, Card } from '@blueprintjs/core';
import clsx from 'clsx';
import { orderBy } from 'lodash';

import { JenkinsJob } from 'modules/Jenkins/models';
import { useJenkinsStore } from 'modules/Jenkins/context';
import { useAppStore } from 'context';
import { Group } from 'models';
import { deletePassword, getJenkinsJobTokenName } from 'utils';
import { JenkinsRunningJob } from 'modules/Jenkins/components/JenkinsRunningJob';

import { JenkinsQuickActions } from './JenkinsQuickActions';
import { JenkinsJobSelect } from './JenkinsJobSelect';
import { onJenkinsJobCardMenu } from './JenkinsJobCardMenu';
import css from './JenkinsJobCard.module.scss';

interface Props {
  job: JenkinsJob;
}

export const JenkinsJobCard: FC<Props> = ({ job }) => {
  const { jobs, setState, runningBuilds } = useJenkinsStore();
  const { groups, groupFilter } = useAppStore();

  const  { fullDisplayName } = job;

  const deleteJob = async () => {
    setState({
      jobs: [
        ...jobs.filter(({ id }) => job.id !== id)
      ]
    });
    await deletePassword(getJenkinsJobTokenName(job.id!));
  };

  const setGroup = (group?: Group) => setState({
    jobs: [
      ...jobs.map(tmpJob => tmpJob.id === job.id
        ? { ...tmpJob, group }
        : tmpJob
      )
    ]
  });

  const openMenu = (e: any) => onJenkinsJobCardMenu(e, job, groups, deleteJob, setGroup);

  let runningBuildsFiltered = [...runningBuilds].filter(({ jobId }) => job.id === jobId);
  runningBuildsFiltered = orderBy(runningBuildsFiltered, ['timestamp'], ['desc']);

  return useMemo(() => {
    return (<>
      <Card
        className={css.root}
        elevation={1}
        onContextMenu={openMenu}
      >
        <div className={clsx(css.block)}>
          <span>{fullDisplayName}</span>
        </div>

        <div className={css.blockStatus}>
          <JenkinsJobSelect job={job} />

          <JenkinsQuickActions job={job} />
        </div>

        <div className={css.blockActions}>
          <ButtonGroup fill={false}>
            <Button
              className={css.button}
              icon='menu'
              onClick={openMenu}
            />
          </ButtonGroup>
        </div>
      </Card>

      {runningBuildsFiltered.map(runningBuild => (
        <JenkinsRunningJob
          job={job}
          key={runningBuild.id}
          runningBuild={runningBuild}
        />
      ))}
    </>);
  }, [job, jobs, groups, groupFilter, runningBuilds, fullDisplayName, groups]); // eslint-disable-line
};