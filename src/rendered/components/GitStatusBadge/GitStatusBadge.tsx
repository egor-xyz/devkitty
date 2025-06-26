import { Icon, type IconName, type Intent, Tooltip } from '@blueprintjs/core';
import { type FC, type JSX } from 'react';

import { Count, Wrapper } from './GitStatusBadge.styles';

type Props = {
  count: number;
  icon: IconName;
  intent: Intent;
  show: boolean;
  tooltip?: JSX.Element;
};

export const GitStatusBadge: FC<Props> = ({ count, icon, intent, show, tooltip }) => {
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
