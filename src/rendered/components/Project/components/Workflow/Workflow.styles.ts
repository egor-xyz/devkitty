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

export const Title = styled.div`
  display: flex;
  text-align: left;
  justify-content: start;
  gap: 15px;
  align-items: center;
  width: 430px;
`;

export const TitleText = styled.div`
  font-size: 13px;
  display: flex;
  flex-direction: column;
`;

export const TitleDescription = styled.div`
  margin-top: -2px;
  font-size: 11px;
  font-weight: 300;

  @media (prefers-color-scheme: dark) {
    color: ${Colors.GRAY3};
  }
`;

export const Event = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  margin-left: 10px;
  font-weight: 300;
  width: 200px;

  @media (prefers-color-scheme: dark) {
    color: ${Colors.GRAY3};
  }
`;
