import { Colors } from '@blueprintjs/core';
import _ActionsIcon from 'rendered/assets/actions.svg?react';
import styled from 'styled-components';

export const ActionsIcon = styled(_ActionsIcon)`
  fill: ${Colors.GRAY1};
  @media (prefers-color-scheme: dark) {
    fill: ${Colors.GRAY4};
  }
`;
