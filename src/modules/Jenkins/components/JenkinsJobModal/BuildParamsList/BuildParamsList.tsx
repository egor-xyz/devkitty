import { FC } from 'react';
import { Button, Collapse, Divider, Tag } from '@blueprintjs/core';

import { JenkinsJob } from 'modules/Jenkins/models';
import { JobParametersTooltip } from 'modules/Jenkins/components/JobParametersTooltip';

import css from './BuildParamsList.module.scss';

interface Props {
  addMode: boolean;
  job: JenkinsJob;
  removeBuildParameters(id?: string):void,
  setAddMode(mode: boolean):void;
}

export const BuildParamsList: FC<Props> = ({
  setAddMode, job: { buildParameters }, addMode, removeBuildParameters
}) => (
  <Collapse
    isOpen={!addMode}
    keepChildrenMounted={false}
  >
    <div className={css.list}>
      {buildParameters?.map(({ id, name, parameters }) => (<div key={id}>
        <div className={css.item}>
          <div className='bp3-text bp3-text-overflow-ellipsis'>
            {name}
          </div>

          <JobParametersTooltip
            parameters={parameters}
            position={'bottom'}
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

          <Button
            icon={'trash'}
            small={true}
            onClick={() => removeBuildParameters(id)}
          />
        </div>
        <Divider />
      </div>
      ))}
    </div>
    <Button
      icon={'build'}
      intent={buildParameters?.length ? 'none' : 'primary'}
      text={'Add configuration'}
      onClick={() => setAddMode(true)}
    />
  </Collapse>
);