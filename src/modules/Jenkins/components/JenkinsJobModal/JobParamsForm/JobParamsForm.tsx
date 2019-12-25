import { FC, useEffect, useMemo, useState } from 'react';
import { Button, Divider } from '@blueprintjs/core';
import { debounce, orderBy, find } from 'lodash';
import { v4 } from 'uuid';

import {
  AddBuildParameter,
  BuildParameter,
  getJenkinsBuild,
  JenkinsBuild,
  JenkinsJob,
  useJenkinsStore
} from 'modules/Jenkins';
import { useModalsStore } from 'modals/context';

import css from './JobParamsForm.module.scss';
import { BuildSelector } from '../BuildSelector';
import { BuildParamsList } from '../BuildParamsList';

interface Props {
  job: JenkinsJob;
  onAdd(job: JenkinsJob):void;
}

export const JobParamsForm: FC<Props> = ({ job: _job, onAdd }) => {
  const { closeModal } = useModalsStore();
  const { servers } = useJenkinsStore();

  const [job, setJob] = useState(_job);
  const [build, setBuild] = useState<JenkinsBuild>({});
  const [buildId, setBuildId] = useState<number | undefined>(job.lastSuccessfulBuild?.number);
  const [buildParameter, setBuildParameter] = useState<BuildParameter>({
    id: v4(),
    name: '',
    parameters: []
  });
  const [addMode, setAddMode] = useState(false);

  const getBuild = debounce(async (buildId?: number) => {
    if (!buildId) return;
    const server = find(servers, { id: job.serverId });
    if (!server || !job.name) return;
    const res = await getJenkinsBuild(server, job.name, buildId);
    if (!res || !res.parameters) {
      setBuild({
        parameters: [],
        result: undefined
      });
      return;
    }

    setBuild({
      ...build,
      ...res
    });

    setBuildParameter({
      ...buildParameter,
      parameters: res.parameters
    });
  }, 500);

  const addBuildParameters = () => {
    setJob({
      ...job,
      buildParameters: [
        ...job.buildParameters ?? [],
        { ...buildParameter }
      ]
    });

    setBuildParameter({
      id: v4(),
      name: '',
      parameters: []
    });

    setAddMode(false);
  };

  const removeBuildParameters = (removeId?: string) => {
    if (!removeId) return;
    const newParams = job.buildParameters?.filter(({ id }) => id !== removeId) ?? [];
    setJob({
      ...job,
      buildParameters: [...newParams]
    });
  };

  useEffect(() => {
    getBuild(buildId);
  }, []); // eslint-disable-line

  const sortedParam = orderBy(build.parameters, ['_class'], ['desc']);

  return useMemo(() => (<div className={css.root}>
    <div className={css.title}>Job Name: {job.fullDisplayName ?? ''}</div>

    <Divider className={css.divider} />

    <BuildParamsList
      addMode={addMode}
      job={job}
      removeBuildParameters={removeBuildParameters}
      setAddMode={setAddMode}
    />

    <BuildSelector
      addMode={addMode}
      build={build}
      buildId={buildId}
      getBuild={getBuild}
      job={job}
      setBuildId={setBuildId}
    />

    <AddBuildParameter
      addBuildParameters={addBuildParameters}
      addMode={addMode}
      build={build}
      buildParameter={buildParameter}
      parameters={sortedParam}
      setBuildParameter={values => setBuildParameter({
        ...buildParameter,
        ...values
      })}
      onCancel={() => setAddMode(false)}
    />

    <div className={css.actions}>
      <Button
        className={css.mr}
        text={'Cancel'}
        onClick={closeModal}
      />

      <Button
        disabled={addMode || !job.buildParameters?.length}
        intent={job.buildParameters?.length ? 'primary' : 'none'}
        text={'Save'}
        onClick={() => onAdd(job)}
      />
    </div>
  </div>), [_job, job, build, buildId, buildParameter, sortedParam]); // eslint-disable-line
};