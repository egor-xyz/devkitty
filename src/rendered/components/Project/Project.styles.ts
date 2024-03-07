import { Colors, Icon } from '@blueprintjs/core';
import styled, { css, keyframes } from 'styled-components';

export const Root = styled.div`
  display: flex;
  position: relative;
  align-items: center;
  justify-content: space-between;
  min-height: 55px;
  padding: 2px 15px 2px 20px;
  background-color: ${Colors.LIGHT_GRAY4};

  & + & {
    margin-top: 2px;
  }

  @media (prefers-color-scheme: dark) {
    background-color: ${Colors.DARK_GRAY2};
  }
`;

export const Info = styled.div`
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 10px;
  gap: 10px;
`;

export const InfoText = styled.div`
  display: flex;
  flex-direction: column;
`;

export const Title = styled.div`
  font-weight: 500;
`;

export const RepoInfo = styled.div`
  margin-top: -2px;
  font-size: 11px;
  font-weight: 300;

  @media (prefers-color-scheme: dark) {
    color: ${Colors.GRAY3};
  }
`;

export const MiddleBlock = styled.div`
  display: flex;
  flex: 2;
  align-items: center;
  min-width: 395px;
  gap: 10px;
`;

export const ProjectActions = styled.div`
  display: flex;
  position: relative;
  flex-direction: row-reverse;
  min-width: 79px;
  margin-left: auto;
  user-select: none;
`;

const blink = keyframes`
 0%, 50% {
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
`;

export const StyledSpinner = styled(Icon)<{ loading: boolean }>(
  ({ loading }) => css`
    position: absolute;
    top: 50%;
    left: -22px;
    margin-right: 10px;
    transform: translateY(-50%);
    transform-origin: center center;
    animation: ${blink} 3s infinite;
    animation-duration: ${loading ? '3s' : '0s'};
    opacity: 0;
  `
);
