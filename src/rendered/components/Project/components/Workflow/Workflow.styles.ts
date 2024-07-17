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
  margin: 2px 0px;

  & + & {
    margin-top: 0;
  }

  @media (prefers-color-scheme: dark) {
    background-color: ${Colors.DARK_GRAY2};
  }
`;

export const Status = styled.div``;

export const MainBlock = styled.div`
  overflow: hidden;
  display: flex;
  text-align: left;
  justify-content: start;
  gap: 15px;
  align-items: center;
`;

export const Title = styled.div`
  overflow: hidden;
  font-size: 13px;
  display: flex;
  flex-direction: column;
`;

export const TitleMain = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const TitleDescription = styled.div`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-top: -2px;
  font-size: 11px;
  font-weight: 300;

  @media (prefers-color-scheme: dark) {
    color: ${Colors.GRAY3};
  }
`;
