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
    case 'action_required':
    case 'pending':
    case 'waiting':
      return ActionPendingIcon;
    case 'cancelled':
    case 'stale':
      return ActionsCanceledIcon;
    case 'completed':
    case 'neutral':
    case 'success':
      return ActionDoneIcon;
    case 'failed':
    case 'failure':
    case 'startup_failure':
    case 'timed_out':
      return ActionFailedIcon;
    case 'in_progress':
      return ActionInProgressIcon;
    case 'queued':
    case 'requested':
      return ActionQueuedIcon;
    case 'skipped':
      return ActionSkippedIcon;
    default:
      return ActionsIcon;
  }
};
