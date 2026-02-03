import { Colors } from '@blueprintjs/core';
import { readableColor } from 'polished';
import styled, { css } from 'styled-components';

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

export const MainBlock = styled.div`
  overflow: hidden;
  display: flex;
  text-align: left;
  justify-content: start;
  gap: 15px;
  align-items: center;
  /* width: 430px; */
`;

export const Title = styled.div`
  overflow: hidden;
  font-size: 13px;
  display: flex;
  flex-direction: column;
`;

export const TitleMain = styled.div`
  display: flex;
  align-items: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
  gap: 8px;
`;

export const TitleDescription = styled.div`
  display: flex;
  align-items: center;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-top: -1px;
  font-size: 12px;
  font-weight: 300;

  @media (prefers-color-scheme: dark) {
    color: ${Colors.GRAY3};
  }
`;

export const BotTag = styled.div`
  border-radius: 4px;
  border: 1px solid ${Colors.BLACK};
  padding: 1px 3px;
  font-size: 10px;
  color: ${Colors.BLACK};

  @media (prefers-color-scheme: dark) {
    color: ${Colors.GRAY3};
    border: 1px solid ${Colors.GRAY3};
  }
`;

export const PullTag = styled.div`
  border-radius: 10px;
  border: 1px solid ${Colors.GRAY2};
  padding: 1px 6px;
  font-size: 10px;
  color: ${Colors.GRAY1};
  background-color: ${Colors.LIGHT_GRAY5};

  @media (prefers-color-scheme: dark) {
    color: ${Colors.GRAY4};
    border: 1px solid ${Colors.GRAY3};
    background-color: ${Colors.DARK_GRAY4};
  }
`;

export const PullLabel = styled.div<{ $bgColor: string }>(
  ({ $bgColor }) => css`
    border-radius: 4px;
    background-color: #${$bgColor};
    padding: 1px 4px;
    font-size: 12px;
    color: ${readableColor(`#${$bgColor}`)};
  `
);

export const Avatar = styled.img`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
`;
