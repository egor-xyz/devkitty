import { Colors } from '@blueprintjs/core';
import actions from 'rendered/assets/actions.svg?react';
import actionDone from 'rendered/assets/action-done.svg?react';
import actionFailed from 'rendered/assets/action-failed.svg?react';
import actionCanceled from 'rendered/assets/action-canceled.svg?react';
import actionInProgressIcon from 'rendered/assets/action-in-progress.svg?react';
import styled, { keyframes } from 'styled-components';

import { Run } from 'types/gitHub';

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
    default:
      return ActionsIcon;
  }
};
