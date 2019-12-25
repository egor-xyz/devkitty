import { FC, useState } from 'react';
import { Button, ButtonGroup, Dialog, Popover } from '@blueprintjs/core';
import clsx from 'clsx';

import { openExternalURL } from 'utils';
import { JenkinsJob } from 'modules/Jenkins/models';
import { useModalsStore } from 'modals/context';
import { JenkinsActiveJobsList, RunJobModal } from 'modules/Jenkins';

import css from './JenkinsQuickActions.module.scss';

interface Props {
  job: JenkinsJob;
  loading?: boolean;
}

export const JenkinsQuickActions:FC<Props> = ({ job, loading }) => {
  const [runJob, setRunJob] = useState(false);
  const { openModal } = useModalsStore();
  return (<>
    <ButtonGroup className={css.root}>
      <Button
        className={clsx({ 'bp3-skeleton': loading })}
        disabled={loading}
        icon={'play'}
        title='Replay job'
        onClick={() => setRunJob(true)}
      />
      <Popover
        content={<JenkinsActiveJobsList job={job} />}
        disabled={loading}
        placement={'bottom'}
      >
        <Button
          alignText={'center'}
          className={clsx({ 'bp3-skeleton': loading })}
          icon={'eye-open'}
          title={'Watch by buildID'}
        />
      </Popover>
      <Button
        alignText={'center'}
        className={clsx({ 'bp3-skeleton': loading })}
        disabled={loading}
        icon={'share'}
        title={'Open on WEB'}
        onClick={() => openExternalURL(job?.url)}
      />
      <Button
        alignText={'center'}
        className={clsx({ 'bp3-skeleton': loading })}
        disabled={loading}
        icon={'edit'}
        title={'Edit configuration'}
        onClick={() => openModal({ data: job, name: 'jenkinsJob' })}
      />
    </ButtonGroup>

    <Dialog
      icon={'play'}
      // isOpen={true}
      isOpen={runJob}
      title={'Run Jenkins Job'}
      onClose={() => setRunJob(false)}
    >
      <RunJobModal
        job={job}
        onClose={() => setRunJob(false)}
      />
    </Dialog>
  </>);
};
