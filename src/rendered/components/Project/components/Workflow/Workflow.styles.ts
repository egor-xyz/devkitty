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
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;

  & + & {
    margin-top: 0;
  }

  @media (prefers-color-scheme: dark) {
    background-color: ${Colors.DARK_GRAY2};
  }
`;

export const ButtonGroup = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
`;

export const Status = styled.div``;

export const MainBlock = styled.div`
  overflow: hidden;
  display: flex;
  text-align: left;
  justify-content: start;
  gap: 15px;
  align-items: center;
  flex: 1;
  min-width: 0;
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

export const JobsList = styled.div`
  padding: 8px 15px 8px 20px;
  background-color: ${Colors.LIGHT_GRAY5};
  width: 100%;
  box-sizing: border-box;

  @media (prefers-color-scheme: dark) {
    background-color: ${Colors.DARK_GRAY1};
  }
`;

export const JobItem = styled.div`
  padding: 0;
  margin: 0;
  background-color: transparent;
  font-size: 12px;
`;

export const JobHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  cursor: pointer;
  background-color: ${Colors.WHITE};
  border-radius: 4px;
  margin: 4px 0;
  user-select: none;
  justify-content: space-between;

  &:hover {
    opacity: 0.8;
  }

  @media (prefers-color-scheme: dark) {
    background-color: ${Colors.DARK_GRAY3};
  }
`;

export const JobHeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

export const TimeText = styled.span`
  font-size: 11px;
  color: ${Colors.GRAY2};
  margin-left: 8px;
  white-space: nowrap;
  flex-shrink: 0;

  @media (prefers-color-scheme: dark) {
    color: ${Colors.GRAY4};
  }
`;

export const JobStep = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 6px 36px;
  font-size: 11px;
  font-weight: 300;
  background-color: ${Colors.WHITE};
  margin: 2px 0;
  border-radius: 3px;
  justify-content: space-between;

  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }

  @media (prefers-color-scheme: dark) {
    background-color: ${Colors.DARK_GRAY3};
    color: ${Colors.GRAY4};
  }
`;

export const JobStepContent = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
