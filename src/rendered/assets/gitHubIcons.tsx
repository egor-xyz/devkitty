import { Colors } from '@blueprintjs/core';
import styled, { keyframes } from 'styled-components';

import { Run } from 'types/gitHub';

import actionDone from './gitHub/action-done.svg?react';
import actionFailed from './gitHub/action-failed.svg?react';
import actionCanceled from './gitHub/action-canceled.svg?react';
import actionInProgressIcon from './gitHub/action-in-progress.svg?react';
import actionPendingIcon from './gitHub/action-pending.svg?react';
import ActionQueuedIcon from './gitHub/action-queued.svg?react';
import actions from './gitHub/actions.svg?react';

export const ActionsIcon = styled(actions)`
  fill: ${Colors.GRAY1};
  @media (prefers-color-scheme: dark) {
    fill: ${Colors.GRAY4};
  }
`;

export const ActionsCanceledIcon = styled(actionCanceled)`
  fill: ${Colors.GRAY1};
  @media (prefers-color-scheme: dark) {
    fill: ${Colors.GRAY4};
  }
`;

export const ActionDoneIcon = styled(actionDone)`
  fill: #1a7f37;
  @media (prefers-color-scheme: dark) {
    fill: #57ab5a;
  }
`;

export const ActionFailedIcon = styled(actionFailed)`
  fill: #d1242f;
  @media (prefers-color-scheme: dark) {
    fill: #e5534b;
  }
`;

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

export const ActionInProgressIcon = styled(actionInProgressIcon)`
  animation: ${rotate} 1s linear infinite;
  height: 16px;
`;

const blink = keyframes`
  0% {
    opacity: 0.2;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.2;
  }
`;

export const ActionPendingIcon = styled(actionPendingIcon)`
  animation: ${blink} 1.5s linear infinite;
  height: 16px;
`;

export const getStatusIcon = (status: Run['status']) => {
  switch (status) {
    case 'completed':
      return ActionDoneIcon;
    case 'failed':
      return ActionFailedIcon;
    case 'cancelled':
      return ActionsCanceledIcon;
    case 'in_progress':
      return ActionInProgressIcon;
    case 'queued':
      return ActionQueuedIcon;
    case 'pending':
      return ActionPendingIcon;
    default:
      return ActionsIcon;
  }
};
