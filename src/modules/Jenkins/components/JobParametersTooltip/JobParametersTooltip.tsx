import { FC } from 'react';
import { HTMLTable, IPopoverProps, Tooltip } from '@blueprintjs/core';
import clsx from 'clsx';

import { Parameter } from 'modules/Jenkins/models';

import css from './JobParametersTooltip.module.scss';

interface Props {
  className?: string;
  parameters?: Parameter[];
  position?: IPopoverProps['position'];
}

export const JobParametersTooltip: FC<Props> = ({ children, parameters = [], position = 'auto', className }) => (
  <Tooltip
    content={(
      <HTMLTable
        bordered={true}
        small={true}
        striped={true}
      >
        <tbody>
          {parameters.map(({ name, value }, key) => (
            <tr key={key}>
              <td>{name}</td>
              <td>{value?.toString()}</td>
            </tr>
          ))}
        </tbody>
      </HTMLTable>
    )}
    disabled={!parameters?.length}
    hoverCloseDelay={100}
    interactionKind={'hover'}
    modifiers={{
      flip: { enabled: false },
      hide: { enabled: false },
      preventOverflow: { enabled: false }
    }}
    popoverClassName={clsx(css.root, className)}
    position={position}
  >
    {children}
  </Tooltip>
);