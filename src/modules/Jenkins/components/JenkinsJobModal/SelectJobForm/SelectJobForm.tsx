import { FC, useState } from 'react';
import { Button, MenuItem } from '@blueprintjs/core';
import clsx from 'clsx';
import { Select } from '@blueprintjs/select';

import { JenkinsJobServer } from 'modules/Jenkins/api';
import { JenkinsJob } from 'modules/Jenkins';

import css from './SelectJobForm.module.scss';

const JobSelect = Select.ofType<JenkinsJobServer>();

interface Props {
  job: JenkinsJob;
  jobs: JenkinsJobServer[];
  onSelect(selectedJob: JenkinsJobServer):void;
}

export const SelectJobForm: FC<Props> = ({ job, jobs, onSelect }) => {
  const [query, setQuery] = useState<string>('');
  return (<div className={css.root}>
    <JobSelect
      filterable={true}
      itemRenderer={(job, { handleClick, index, modifiers: { disabled, active } }) => (
        <MenuItem
          active={active}
          disabled={disabled}
          key={index}
          text={job.name}
          onClick={handleClick}
        />
      )}
      items={jobs.filter(({ name }) => name.includes(query))}
      popoverProps={{
        portalClassName: clsx(css.select)
      }}
      onItemSelect={onSelect}
      onQueryChange={setQuery}
    >
      <Button
        icon={'list'}
        text={'Select Jenkins job'}
      />
    </JobSelect>
  </div>);
};