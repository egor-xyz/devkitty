import { Colors } from '@blueprintjs/core';
import styled, { css } from 'styled-components';

export const Root = styled.div`
  display: flex;
  flex-direction: column;
  background-color: ${Colors.LIGHT_GRAY5};

  @media (prefers-color-scheme: dark) {
    background-color: ${Colors.DARK_GRAY1};
  }
`;

export const GroupTitle = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  padding: 4px 15px 4px 20px;
  font-size: 14px;
  font-weight: 300;
  text-transform: uppercase;
  cursor: pointer;
  user-select: none;
  gap: 0 10px;

  @media (prefers-color-scheme: dark) {
    color: ${Colors.DARK_GRAY5};
  }
`;

export const GroupBody = styled.div<{ $collapsed: boolean; $length: number }>(
  ({ $collapsed: collapsed, $length: length }) => css`
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: ${length * 40 + (length - 1) * 2}px;
    max-height: 100%;
    padding: 4px 0;
    overflow: hidden;
    overflow-y: visible;
    transition: all 0.3s ease-in-out;

    ${collapsed &&
    css`
      min-height: 0;
      max-height: 0;
      overflow: hidden;
    `}
  `
);
