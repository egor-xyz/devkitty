import { FC } from 'react';
import { Collapse, NumericInput, Tag, Tooltip } from '@blueprintjs/core';

import { getJenkinsBuildIntent } from 'modules/Jenkins/utils';
import { JenkinsBuild, JenkinsJob } from 'modules/Jenkins/models';

import css from './BuildSelector.module.scss';

interface Props {
  addMode: boolean;
  build: JenkinsBuild,
  buildId?: number;
  getBuild(buildId: number):void;
  job: JenkinsJob;
  setBuildId(buildId: number):void;
}

export const BuildSelector: FC<Props> = ({ addMode, job, build, buildId, setBuildId, getBuild }) => (
  <Collapse
    className={css.buildSettings}
    isOpen={addMode}
  >
    <NumericInput
      leftIcon={'build'}
      max={job.lastSuccessfulBuild?.number}
      min={job.firstBuild?.number}
      placeholder={'Build number'}
      rightElement={(
        <Tag
          intent={'primary'}
          interactive={true}
          minimal={true}
        ># Build</Tag>
      )}
      value={buildId}
      onValueChange={buildId => {
        setBuildId(buildId);
        getBuild(buildId);
      }}
    />

    {build?.result && (
      <Tooltip content={build.fullDisplayName}>
        <Tag
          className={css.tag}
          intent={getJenkinsBuildIntent(build?.result)}
        >
          {build?.result ?? ''}
        </Tag>
      </Tooltip>
    )}
  </Collapse>
);