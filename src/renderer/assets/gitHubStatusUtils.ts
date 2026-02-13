import { type Run } from 'types/gitHub';

import ActionQueuedIcon from './gitHub/action-queued.svg?react';
import ActionSkippedIcon from './gitHub/action-skipped.svg?react';
import {
  ActionDoneIcon,
  ActionFailedIcon,
  ActionInProgressIcon,
  ActionPendingIcon,
  ActionsCanceledIcon,
  ActionsIcon
} from './gitHubIcons';

export const getStatusIcon = (status: Run['status']) => {
  switch (status) {
    case 'cancelled':
      return ActionsCanceledIcon;
    case 'completed':
    case 'success':
      return ActionDoneIcon;
    case 'failed':
    case 'failure':
      return ActionFailedIcon;
    case 'in_progress':
      return ActionInProgressIcon;
    case 'pending':
      return ActionPendingIcon;
    case 'queued':
      return ActionQueuedIcon;
    case 'skipped':
      return ActionSkippedIcon;
    default:
      return ActionsIcon;
  }
};
