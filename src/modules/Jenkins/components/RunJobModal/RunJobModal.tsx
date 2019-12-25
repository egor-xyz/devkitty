import { FC, useEffect, useMemo, useState } from 'react';
import { find, orderBy } from 'lodash';
import { Button, Classes, Divider, Spinner, Tooltip } from '@blueprintjs/core';
import { v4 } from 'uuid';
import clsx from 'clsx';

import { JenkinsJob } from 'modules/Jenkins/models';
import { getJenkinsJob, startJenkinsJob } from 'modules/Jenkins/api';
import { useJenkinsStore } from 'modules/Jenkins/context';
import { useModalsStore } from 'modals';

import css from './RunJobModal.module.scss';
import { RunParameterBlock } from './components';
import { RunParam, RunParams } from '../types';

interface Props {
  job: JenkinsJob;
  onClose():void;
}

export const RunJobModal: FC<Props> = ({ job, onClose }) => {
  const { jobs, setState, runningBuilds, servers } = useJenkinsStore();
  const { closeModal } = useModalsStore();

  const [runParams, setRunParams] = useState<RunParams>([]);
  const [touched, setTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { name = '', parameters = [] } = find(job.buildParameters, { id: job.buildParameterId }) ?? {};

  const server = find(servers, { id: job.serverId });

  const getData = async () => {
    if (!server || !job.name) {
      closeModal();
      return;
    }
    const res = await getJenkinsJob(server, job.name);
    if (!res) {
      closeModal();
      return;
    }

    const runParams: RunParams = [];
    res.parameterDefinitions?.forEach(({ name, description, _class, defaultParameterValue: { value, _class: _class2 } }) => {
      const runParam: RunParam = {
        _class,
        defValue: value,
        description,
        name,
        value: find(parameters, { name })?.value,
      };

      if (_class.includes('Readonly') || _class.includes('HideParameter')) {
        runParam.readonly = true;
      }

      if (_class.includes('ChoiceParameter')) {
        runParam.warningMessage = '[WARNING] Choice parameter are not supported';
      }

      runParams.push(runParam);
    });

    setRunParams(orderBy(runParams, ['readonly'], ['desc']));
    setIsLoading(false);
  };

  const updateJob = () => {
    const newJobs = [...jobs];
    const newJob = find(newJobs, { id: job.id });
    if (!newJob || !newJob.buildParameters) return;
    let newParameters = [...parameters];
    newParameters = newParameters.map(param => {
      const runParam = find(runParams, { name: param.name });
      param.value = runParam?.value ?? param.value;
      return param;
    });
    let newParams = find(newJob.buildParameters, { id: newJob.buildParameterId });
    if (!newParams) return;
    newParams.parameters = newParameters;
    setState({ jobs: [...newJobs] });
    setTouched(false);
  };

  const runBuild = async () => {
    onClose();

    if (!server) return;

    const res = await startJenkinsJob(server, job, runParams);
    if (!res.success) {
      setIsLoading(false);
      return;
    }

    if (res.queueURL) {
      setState({
        runningBuilds: [
          ...runningBuilds,
          {
            id: v4(),
            jobId: job.id!,
            queueUrl: res.queueURL,
            timestamp: Date.now()
          }
        ]
      });
    }
  };

  useEffect(() => {
    getData();
  }, []); // eslint-disable-line

  return useMemo(() => (<div className={css.root}>
    <div className={Classes.DIALOG_BODY}>
      Run <b>{job.name}</b> with config <b>{name}</b>.

      <Divider className={css.divider} />

      <div className={css.params}>
        {runParams.map((runParam, key) => (
          <RunParameterBlock
            index={key}
            key={key}
            runParam={runParam}
            runParams={runParams}
            setRunParams={setRunParams}
            setTouched={setTouched}
          />
        ))}
      </div>
    </div>

    <div className={Classes.DIALOG_FOOTER}>
      <div className={clsx(Classes.DIALOG_FOOTER_ACTIONS, css.actions)}>
        <Button
          className={css.updateBtn}
          disabled={!touched}
          text={'Update Job'}
          onClick={updateJob}
        />

        <Button
          text={'Cancel'}
          onClick={onClose}
        />

        <Tooltip
          content={<div>
            Jenkins Job configuration was changed!<br />
            Please parse last builds again
          </div>}
          disabled={true}
          intent={'danger'}
        >
          <Button
            disabled={isLoading}
            intent={'primary'}
            text={'Run'}
            onClick={runBuild}
          />
        </Tooltip>
      </div>
    </div>

    {isLoading && (
      <div className={css.spinner}>
        <Spinner />
      </div>
    )}
  </div>), [runParams, touched, job, isLoading]); // eslint-disable-line
};