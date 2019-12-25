import { FC, useEffect, useState } from 'react';
import { Spinner, Tab, Tabs } from '@blueprintjs/core';
import { v4 } from 'uuid';
import { find, findIndex } from 'lodash';
import clsx from 'clsx';
import { useHistory } from 'react-router';

import { getJenkinsAllJobs, JenkinsJob, useJenkinsStore } from 'modules/Jenkins';
import { useModalsStore } from 'modals/context';
import { msg } from 'utils/Msg';

import { SelectServer } from './SettingsForm';
import { SelectJobForm } from './SelectJobForm';
import { JobParamsForm } from './JobParamsForm';
import { getJenkinsJob, JenkinsJobServer } from '../../api';
import css from './JenkinsJobModal.module.scss';

type ModalState = 'server' | 'job' | 'parameters';

export const JenkinsJobModal: FC = () => {
  const { jobs: savedJobs, setState, servers } = useJenkinsStore();
  const { closeModal, data } = useModalsStore();

  const history = useHistory();
  const [job, setJob] = useState<JenkinsJob>({ id: v4() });
  const [jobs, setJobs] = useState<JenkinsJobServer[]>([]);
  const [modalState, setModalState] = useState<ModalState>(data ? 'parameters' : 'server');
  const [loading, setLoading] = useState(true);

  const getJobs = async (): Promise<boolean | void> => {
    if (!loading) setLoading(true);
    const server = find(servers, { id: job.serverId });
    if (!server) {
      closeModal();
      return;
    }
    const res = await getJenkinsAllJobs(server);
    if (!res.success) {
      msg.show({
        icon: 'key',
        intent: 'danger',
        message: 'Error: Invalid Credentials',
        timeout: 2000
      });
      setLoading(false);
      return;
    }
    setJobs(res.jobs!);
    setModalState('job');
    setLoading(false);
  };

  const getJob = async (selectedJob: JenkinsJobServer) => {
    if (!loading) setLoading(true);

    const newJob = {
      ...job,
      ...selectedJob
    };

    const server = find(servers, { id: newJob.serverId });
    if (!server || !newJob.name) {
      closeModal();
      return;
    }

    const res = await getJenkinsJob(server, newJob.name);
    if (!res) {
      msg.show({
        icon: 'warning-sign',
        intent: 'danger',
        message: 'Error: Get Jenkins Job',
        timeout: 2000
      });
      setLoading(false);
      return;
    }

    setJob({
      ...newJob,
      ...res
    });

    setModalState('parameters');
    setLoading(false);
  };

  const saveJob = (job: JenkinsJob) => {
    if (!job.buildParameters?.length) {
      msg.show({
        icon: 'build',
        intent: 'warning',
        message: 'Please add configuration',
        timeout: 2000
      });
      return;
    }

    // set default selected param
    job.buildParameterId = job.buildParameters[0].id;

    if (data?.id) {
      let index = findIndex(savedJobs, { id: data.id });
      if (index === -1) return;
      savedJobs[index] = { ...job };
      setState({
        jobs: [...savedJobs]
      });
      closeModal();
      return;
    }

    setState({
      jobs: [...savedJobs, { ...job }]
    });
    closeModal();
    history.push('/jenkins');
  };

  const init = async () => {
    if (!data) {
      setLoading(false);
      return;
    }

    const server = find(servers, { id: data.serverId });
    if (!server) return;

    const job = await getJenkinsJob(server, data.name);
    if (!job) {
      closeModal();
      return;
    }

    setJob({
      ...data,
      ...job
    });

    setLoading(false);
  };

  useEffect(() => {
    init();
  }, []); // eslint-disable-line

  if (loading) return (
    <div className={css.loader}>
      <Spinner intent={'primary'} />
    </div>
  );

  return (<div className={css.root} >
    <Tabs
      className={clsx(css.tabs, { [css.hideTabs]: data })}
      id={'JenkinsJobModal'}
      renderActiveTabPanelOnly={true}
      selectedTabId={modalState}
      onChange={(id: any) => setModalState(id)}
    >
      <Tab
        id={'server'}
        panel={(
          <SelectServer
            job={job}
            setJob={setJob}
            onSave={getJobs}
          />
        )}
        title={'Server'}
      />

      <Tab
        disabled={!(modalState === 'job' || modalState === 'parameters')}
        id={'job'}
        panel={(
          <SelectJobForm
            job={job}
            jobs={jobs}
            onSelect={getJob}
          />
        )}
        title={'Job'}
      />

      <Tab
        disabled={modalState !== 'parameters'}
        id={'parameters'}
        panel={(
          <JobParamsForm
            job={job}
            onAdd={saveJob}
          />
        )}
        title={'Parameters'}
      />
    </Tabs>
  </div>);
};