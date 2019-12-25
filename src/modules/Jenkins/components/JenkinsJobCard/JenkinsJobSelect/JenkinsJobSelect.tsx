import { FC } from 'react';
import { Select } from '@blueprintjs/select';
import { Button, Icon, MenuItem } from '@blueprintjs/core';
import { find } from 'lodash';
import clsx from 'clsx';

import { JenkinsJob } from 'modules/Jenkins/models';
import { useJenkinsStore } from 'modules/Jenkins/context';

import css from './JenkinsJobSelect.module.scss';

interface Props {
  job: JenkinsJob;
  loading?: boolean;
}

export const JenkinsJobSelect: FC<Props> = ({ job: { id, buildParameters, buildParameterId }, loading }) => {
  const { jobs, setState } = useJenkinsStore();
  if (!buildParameters?.length) return null;

  const { name } = find(buildParameters, { id: buildParameterId }) ?? buildParameters[0];

  const onChange = (buildParameterId: string) => {
    const job = find(jobs, { id });
    if (!job) return;
    job.buildParameterId = buildParameterId;
    setState({ jobs: [...jobs] });
  };

  return (<div className={css.root}>
    <Select
      disabled={loading}
      filterable={false}
      itemRenderer={({ name, id }, { handleClick }) => (
        <MenuItem
          className={css.menuItem}
          icon={'build'}
          key={id}
          text={name}
          onClick={handleClick}
        />
      )}
      items={buildParameters}
      onItemSelect={({ id }) => onChange(id!)}
    >
      <Button
        className={clsx(css.selectBtn, { 'bp3-skeleton': loading })}
        rightIcon='double-caret-vertical'
        text={(<div className={css.selectBtnText}>
          <Icon icon={'build'} />
          <span>{name}</span>
        </div>)}
      />
    </Select>
  </div>);
};