import styled from 'styled-components';
import { Colors } from '@blueprintjs/core';
import Ukrain from 'rendered/assets/ukrain.svg?react';

export const Root = styled.div`
  display: flex;
  position: relative;
  flex-direction: column;
  height: calc(100vh - 50px);

  @media (prefers-color-scheme: light) {
    background-color: ${Colors.LIGHT_GRAY2};
  }
`;

export const ProjectsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-content: last baseline;
  height: 100%;
  padding: 0 0 4px;
  overflow-y: auto;
  scrollbar-width: none;
  scroll-behavior: smooth;

  &::-webkit-scrollbar {
    width: 0;
    height: 0;
  }
`;

export const Flag = styled(Ukrain)`
  position: absolute;
  z-index: -1;
  right: 15px;
  bottom: 15px;
  width: auto;
  height: 50px;
  pointer-events: none;
`;
