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
  left: 10px;
  background-color: #000;
  border-radius: 11px;
  padding: 2px 8px;
  font-size: 10px;
  color: #fff;

  @media (prefers-color-scheme: dark) {
    background-color: #000;
  }
`;

export const Actions = styled.div`
  display: flex;
  position: absolute;
  top: -8px;
  right: 60px;
  background-color: #000;
  border-radius: 11px;
  padding: 2px 8px;
  font-size: 10px;
  gap: 10px;
  opacity: 0;
  transition: opacity 0.2s;
  color: #fff;

  @media (prefers-color-scheme: dark) {
    background-color: #000;
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
  border: 1px solid #000;
  margin: 5px 5px;
  position: relative;

  &:hover {
    ${Actions} {
      opacity: 1;
    }
  }
`;
