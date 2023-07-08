import { FC, JSX } from 'react';
import { Icon, Tooltip, IconName, Intent } from '@blueprintjs/core';

import { Count, Wrapper } from './GitStatusBadge.styles';

type Props = {
  count: number;
  icon: IconName;
  intent: Intent;
  show: boolean;
  tooltip?: JSX.Element;
};

export const GitStatusBadge: FC<Props> = ({ show, tooltip, count, icon, intent }) => {
  if (!show) return null;
  return (
    <Tooltip
      content={tooltip}
      disabled={!tooltip}
      position="bottom-right"
    >
      <Wrapper>
        <Icon
          icon={icon}
          intent={intent}
        />
        <Count>{count}</Count>
      </Wrapper>
    </Tooltip>
  );
};
