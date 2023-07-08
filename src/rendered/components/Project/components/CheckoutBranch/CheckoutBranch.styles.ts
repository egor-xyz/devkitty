import { Colors } from '@blueprintjs/core';
import styled from 'styled-components';

export const Root = styled.div`
  display: flex;
  flex-direction: column;
`;

export const BranchLabel = styled.div`
  max-width: 240px;
  margin-top: 2px;
  overflow: hidden;
  font-size: 12px;
  font-weight: 300;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (prefers-color-scheme: dark) {
    color: ${Colors.GRAY3};
  }
`;
