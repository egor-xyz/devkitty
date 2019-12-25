import { FC } from 'react';
import clsx from 'clsx';
import { Button, ButtonGroup, Card, Tag } from '@blueprintjs/core';

import { JenkinsJob } from 'modules/Jenkins/models';

import css from '../JenkinsJobCard.module.scss';

interface Props {
  deleteJob():void;
  job: JenkinsJob;
  refresh():void;
}

export const JenkinsJobCardError: FC<Props> = ({ job: { fullDisplayName }, deleteJob, refresh }) => (
  <Card
    className={css.root}
    elevation={1}
  >
    <div className={clsx(css.block, css.jenkinsErrorName)}>
      <div>
        <Tag
          intent={'danger'}
          interactive={true}
        >Error</Tag>
        <span className={css.ml}>{fullDisplayName}</span>
        <span className={css.ml}>Wrong credentials or service unavailable</span>
      </div>
    </div>

    <div className={css.blockActions}>
      <ButtonGroup fill={false}>
        <Button
          className={css.button}
          icon='refresh'
          onClick={refresh}
        />
        <Button
          className={css.button}
          icon='trash'
          onClick={deleteJob}
        />
      </ButtonGroup>
    </div>
  </Card>
);