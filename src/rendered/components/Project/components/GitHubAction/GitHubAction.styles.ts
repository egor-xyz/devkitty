import { Colors } from '@blueprintjs/core';
import styled from 'styled-components';

export const Root = styled.div`
  display: flex;
  position: relative;
  align-items: center;
  justify-content: space-between;
  min-height: 20px;
  padding: 6px 15px 6px 20px;
  background-color: ${Colors.LIGHT_GRAY4};
  margin: 2px 2px;

  & + & {
    margin-top: 0;
  }

  @media (prefers-color-scheme: dark) {
    background-color: ${Colors.DARK_GRAY2};
  }
`;
