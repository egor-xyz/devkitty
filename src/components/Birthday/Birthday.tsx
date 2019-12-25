import { FC } from 'react';
import { Card } from '@blueprintjs/core';

import css from './Birthday.module.scss';

export const Birthday:FC = () => (
  <Card className={css.root}>
    <span
      aria-label=''
      role='img'
    >🎁</span>
    <span
      aria-label=''
      role='img'
    >🎁</span>
    <span
      aria-label=''
      role='img'
    >🎁</span>
    <span>Happy Birthday Pavel!</span>
    <span
      aria-label=''
      role='img'
    >🎁</span>
    <span
      aria-label=''
      role='img'
    >🎁</span>
    <span
      aria-label=''
      role='img'
    >🎁</span>
  </Card>
);