import { FC } from 'react';
import { Spinner } from '@blueprintjs/core';
import qs from 'query-string';

import css from './OAuthCallback.module.scss';

export const OAuthCallback: FC = () => {
  const { code } = qs.parse(window.location.search);
  if (code) localStorage.setItem('ghCode', code as string);
  window.close();
  return (
    <div className={css.root}>
      <Spinner intent={'primary'} />
    </div>
  );
};