import { Icon, type IconName, type Intent, Tooltip } from '@blueprintjs/core';
import { type FC, type JSX } from 'react';

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
      <div className="flex flex-col items-center ml-1 text-center">
        <Icon
          icon={icon}
          intent={intent}
        />

        <div className="text-xs font-light text-left">{count}</div>
      </div>
    </Tooltip>
  );
};
