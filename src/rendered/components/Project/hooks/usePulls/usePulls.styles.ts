import { Colors } from '@blueprintjs/core';
import styled, { css } from 'styled-components';

export const Empty = styled.div`
  padding: 10px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const Title = styled.div`
  position: absolute;
  top: -10px;
  left: 15px;
  background-color: ${Colors.LIGHT_GRAY2};
  border-radius: 11px;
  padding: 2px 8px;
  font-size: 12px;
  color: #000;

  @media (prefers-color-scheme: dark) {
    background-color: #000;
    color: #fff;
  }
`;

export const Actions = styled.div`
  display: flex;
  position: absolute;
  top: -10px;
  right: 15px;
  background-color: ${Colors.LIGHT_GRAY2};
  border-radius: 11px;
  padding: 2px 8px;
  font-size: 12px;
  gap: 10px;
  opacity: 0;
  transition: opacity 0.2s;
  color: #000;

  @media (prefers-color-scheme: dark) {
    background-color: #000;
    color: #fff;
  }
`;

export const Action = styled.div<{ $active?: boolean }>(
  ({ $active }) => css`
    cursor: pointer;

    ${Boolean($active) &&
    css`
      font-weight: bold;
    `}
  `
);

export const WrapBlock = styled.div`
  border: 1px solid ${Colors.LIGHT_GRAY2};
  margin: 2px 0;
  position: relative;

  &:hover {
    ${Actions} {
      opacity: 1;
    }
  }

  @media (prefers-color-scheme: dark) {
    border-color: #000;
  }
`;
