import { Colors } from '@blueprintjs/core';
import styled from 'styled-components';

export const Empty = styled.div`
  padding: 10px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const WrapBlock = styled.div`
  border-top: 1px solid ${Colors.LIGHT_GRAY2};
  margin-top: 2px;
  position: relative;

  @media (prefers-color-scheme: dark) {
    border-color: #000;
  }
`;
