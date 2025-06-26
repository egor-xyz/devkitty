import { Colors } from '@blueprintjs/core';
import styled, { css } from 'styled-components';

export const Root = styled.div`
  width: 420px;
  display: flex;
  justify-content: space-between;
  margin: 0 auto 20px;
`;

export const ThemeButton = styled.div<{ $active?: boolean }>(
  ({ $active: active }) => css`
    text-align: center;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 4px;
    font-size: 13px;

    img {
      overflow: hidden;
      display: block;
      border-radius: 11px;
      width: 120px;
      border: 3px solid transparent;
      object-fit: cover;
      border-color: ${active ? Colors.BLUE3 : 'transparent'};
    }
  `
);
