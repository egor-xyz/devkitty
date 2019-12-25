import { FC, useEffect, useState } from 'react';
import { Button, NumericInput, Spinner, Tag } from '@blueprintjs/core';
import { find , debounce } from 'lodash';
import { v4 } from 'uuid';
import clsx from 'clsx';

import { JenkinsBuild, JenkinsJob } from 'modules/Jenkins/models';
import { getJenkinsBuild, getJenkinsJob } from 'modules/Jenkins/api';
import { useJenkinsStore } from 'modules/Jenkins/context';
import { JobParametersTooltip } from 'modules/Jenkins/components/JobParametersTooltip';

import css from './JenkinsActiveJobsList.module.scss';

interface Props {
  job: JenkinsJob;
}

export const JenkinsActiveJobsList: FC<Props> = ({ job }) => {
  const { servers, setState, runningBuilds } = useJenkinsStore();

  const [isLoading, setIsLoading] = useState(true);
  const [buildId, setBuildId] = useState(0);
  const [max, setMax] = useState<number>();
  const [build, setBuild] = useState<JenkinsBuild>();

  const server = find(servers, { id: job.serverId });

  const getList = async () => {
    if (!server || !job.name) return;
    const res = await getJenkinsJob(server, job.name);
    if (!res) return;
    setBuildId(res.lastBuild?.number ?? 0);

    setMax(res.lastBuild?.number ?? 0);
    setIsLoading(false);
  };

  const getBuildInfo = debounce(async (buildId?: number) => {
    if (!server || !job.name || !buildId) return;
    const res = await getJenkinsBuild(server, job.name, buildId);
    if (!res) return;
    setBuild(res);
  }, 500);

  const watchBuild = () => {
    setState({
      runningBuilds: [
        ...runningBuilds,
        {
          buildId: buildId,
          id: v4(),
          jobId: job.id!,
          timestamp: Date.now()
        }
      ]
    });
  };

  useEffect(() => {
    setBuild(undefined);
    getBuildInfo(buildId);
  }, [buildId]); //eslint-disable-line

  useEffect(() => {
    getList();
  }, []); // eslint-disable-line

  return (
    <div className={css.root}>
      {isLoading && (
        <Spinner
          intent={'primary'}
          size={35}
        />
      )}

      {!isLoading && (<>
        <div className={css.row}>
          <NumericInput
            buttonPosition={'left'}
            leftIcon={'build'}
            max={max}
            min={1}
            value={buildId}
            onButtonClick={setBuildId}
          />
          <Button
            icon={'eye-open'}
            title={'Watch by buildID'}
            onClick={watchBuild}
          />
        </div>

        <div className={clsx(css.row2, { 'bp3-skeleton': !build?.parameters })}>
          <JobParametersTooltip
            className={css.table}
            parameters={build?.parameters}
            position={'bottom-right'}
          >
            <Tag
              className={css.params}
              icon={'build'}
              intent={'primary'}
              interactive={true}
              minimal={true}
            >
              Parameters
            </Tag>
          </JobParametersTooltip>
        </div>
      </>)}
    </div>
  );
};