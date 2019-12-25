import { FC, Fragment, useState } from 'react';
import { Icon } from '@blueprintjs/core';
import toPairs from 'lodash/toPairs';
import isArray from 'lodash/isArray';
import { IconName } from '@blueprintjs/icons';
import clsx from 'clsx';

import { Root } from './InfoItem.styles';

interface Values {
  [name: string]: string | number | undefined;
}

interface Props {
  defaultOpen?: boolean;
  icon?: IconName;
  showCollapse?: boolean;
  title: string | number;
  values: Values | string[];
}

export const InfoItem:FC<Props> = ({ title, icon, values, defaultOpen = false, showCollapse = true }) => {
  const [isOpen, setOpen] = useState(defaultOpen);
  return (<Root>
    <div
      className='title'
      onClick={() => setOpen(!isOpen)}
    >
      {icon && (
        <Icon
          className='leftIcon'
          icon={icon}
          iconSize={12}
        />
      )}
      <span>{title}</span>
      {showCollapse && (
        <Icon
          className='rightIcon'
          icon={isOpen ? 'minimize' : 'maximize' }
          iconSize={14}
        />
      )}
    </div>
    <div
      className={clsx('block', {
        'block__active': !showCollapse || isOpen,
        'oneColumn': isArray(values)
      })}
    >
      {isArray(values) && <div className='bp3-code'>{values.join('\n')}</div>}
      {!isArray(values) && toPairs(values).map(([key, value]) => {
        if (!value) return null;
        return (
          <Fragment key={key}>
            <span>{key}</span>
            <span className='bp3-code'>{value}</span>
          </Fragment>
        );
      })}
    </div>
  </Root>);
};