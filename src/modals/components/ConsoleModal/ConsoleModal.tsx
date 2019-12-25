import { FC, useMemo } from 'react';
import clsx from 'clsx';

import { useModalsStore } from 'modals/context';

import css from './ConsoleModal.module.scss';

export const ConsoleModal: FC = () => {
  const { data } = useModalsStore();
  const error = data?.message ?? '';
  return useMemo(() => <div className={clsx(css.root)}>{error}</div>, [error]);
};