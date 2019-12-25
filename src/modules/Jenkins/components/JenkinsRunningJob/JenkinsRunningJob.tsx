import { FC, useEffect, useRef, useState } from 'react';
import { find, findIndex } from 'lodash';
import { Button, ButtonGroup, Card, ProgressBar, Tag } from '@blueprintjs/core';
import moment from 'moment';
import clsx from 'clsx';
import { remote } from 'electron';

import { JenkinsBuild, JenkinsJob } from 'modules/Jenkins/models';
import { getJenkinsBuild, getQueue } from 'modules/Jenkins/api';
import { msg, openExternalURL } from 'utils';
import { getJenkinsBuildIntent } from 'modules/Jenkins/utils';
import { RunningBuild, useJenkinsStore } from 'modules/Jenkins/context';
import { JenkinsJobCardError } from 'modules/Jenkins/components/JenkinsJobCard/JenkinsJobCardError';

import css from './JenkinsRunningJob.module.scss';

const PENDING_TIME = 5000;

interface Props {
  job: JenkinsJob;
  runningBuild: RunningBuild;
}

export const JenkinsRunningJob: FC<Props> = ({ runningBuild, job }) => {
  const { setState, runningBuilds, servers } = useJenkinsStore();

  const intervalID = useRef<number>();
  const timeoutID = useRef<number>();
  const percent = useRef<number>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [build, setBuild] = useState<JenkinsBuild>();
  const [pending, setPending] = useState(false);
  const [est, setEst] = useState<number | undefined>();
  const [why, setWhy] = useState<string | undefined>();

  const { id, queueUrl, buildId } = runningBuild;

  const server = find(servers, { id: job.serverId });

  const clear = () => {
    clearInterval(intervalID.current);
    clearTimeout(timeoutID.current);
    intervalID.current = undefined;
    timeoutID.current = undefined;
  };

  const getQueueData = async (watcher: boolean) => {
    if (!queueUrl || !server) return;

    const res = await getQueue(server, queueUrl);

    if (!res.id) {
      !watcher && setLoading(false);
      setWhy(res.why);
      setPending(true);

      timeoutID.current = window.setTimeout(() => {
        clear();
        getBuild();
      }, PENDING_TIME);

      return;
    }

    const newRunningBuilds = [...runningBuilds];
    const newRunningBuild = find(newRunningBuilds, { id });
    if (!newRunningBuild) return;

    newRunningBuild.buildId = res.id;
    setWhy(undefined);
    setPending(false);
    setState({
      runningBuilds: [...newRunningBuilds]
    });
    setLoading(false);
  };

  const getBuild = async (build?: JenkinsBuild, watcher = false) => {
    if (!buildId) {
      getQueueData(watcher);
      return;
    }

    !watcher && setLoading(true);

    if (!server || !job.name) {
      setLoading(false);
      return;
    }

    const res = await getJenkinsBuild(server, job.name, buildId);
    if (!res) {
      clear();
      setError(true);
      setLoading(false);
      msg.show({
        icon: 'warning-sign',
        intent: 'danger',
        message: `Jenkins error: ${job.name}`,
        timeout: 2000
      });
      return;
    }

    if(build?.building && !res.building) {
      new remote.Notification({
        body: res.fullDisplayName ?? '',
        closeButtonText: 'Hide',
        subtitle: res.result ?? '',
        title: 'Jenkins'
      }).show();
    }

    setBuild({ ...res });
    setLoading(false);

    runWatcher(res);
  };

  const runWatcher = (build?: JenkinsBuild) => {
    if (!build?.building) {
      clear();
      return;
    }

    if (intervalID.current || timeoutID.current) return;

    let tmpEst = moment(build?.timestamp! + build?.estimatedDuration!).diff(moment());
    tmpEst = tmpEst / 2;
    if (tmpEst <= 1000) tmpEst = 5000;

    intervalID.current = window.setInterval(async () => {
      if (!build?.building) {
        clear();
        return;
      }
      setEst(moment(build?.timestamp! + build?.estimatedDuration!).diff(moment()));
    }, 1000);

    timeoutID.current = window.setTimeout(() => {
      clear();
      getBuild(build, true);
    }, tmpEst);
  };

  const deleteBuild = () => {
    const newRunningBuilds = [...runningBuilds];
    const index = findIndex(newRunningBuilds, { id });
    if (index === -1) return;
    newRunningBuilds.splice(index, 1);
    setState({
      runningBuilds: [...newRunningBuilds]
    });
  };

  useEffect(() => {
    getBuild();
    return () => clear();
  }, [buildId]); // eslint-disable-line

  let buildStatus = build?.result;
  if (build?.building) {
    buildStatus = (est ?? 0) > 0
      ? `BUILDING ${moment(est).format('mm:ss')}`
      : 'BUILDING'
    ;
    percent.current =  (Date.now() - build?.timestamp!) / build?.estimatedDuration!;
  }

  let buildIntent = build?.building
    ? 'primary'
    : getJenkinsBuildIntent(build?.result);

  if (pending) {
    buildStatus = 'PENDING';
    buildIntent = 'warning';
  }

  if (error) return (
    <JenkinsJobCardError
      deleteJob={deleteBuild}
      job={job}
      refresh={() => getBuild(build)}
    />
  );

  return (
    <Card className={css.root}>
      <div className={css.block}>
        <Tag
          className={clsx(css.status, { 'bp3-skeleton': loading })}
          intent={buildIntent}
          minimal={true}
        >
          {buildStatus}
        </Tag>
      </div>

      <div className={clsx(css.blockStatus, { 'bp3-skeleton': loading })}>
        {build?.id && <span>#{build?.id}</span>}

        <div className={css.date}>
          {build?.timestamp && moment(build?.timestamp ?? '').format('D.MM.YY HH:mm')}
        </div>
        <div
          className={css.text}
          title={why ?? build?.fullDisplayName}
        >
          {why ?? build?.fullDisplayName}
        </div>
      </div>

      {build?.building && !loading && (
        <ProgressBar
          animate={false}
          className={css.progress}
          intent={'primary'}
          stripes={false}
          value={percent.current}
        />
      )}

      <div className={css.block}>
        <ButtonGroup >
          <Button
            className={clsx(css.button, { 'bp3-skeleton': loading })}
            disabled={loading}
            icon={'refresh'}
            onClick={() => getBuild(build)}
          />
          <Button
            className={clsx({ 'bp3-skeleton': loading })}
            disabled={loading}
            icon={'share'}
            title={'Open on WEB'}
            onClick={() => openExternalURL(`${job?.url}/${buildId}`)}
          />
          <Button
            className={clsx(css.button, { 'bp3-skeleton': loading })}
            disabled={loading}
            icon={'trash'}
            onClick={deleteBuild}
          />
        </ButtonGroup>
      </div>
    </Card>
  );
};