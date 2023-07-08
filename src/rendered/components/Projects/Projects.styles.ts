import styled from 'styled-components';
import { Colors } from '@blueprintjs/core';

import Ukrain from 'rendered/assets/ukrain.svg';

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

export const TextLogo = styled.div`
  position: absolute;
  z-index: -1;
  bottom: 15px;
  left: 15px;
  padding: 8px 10px;
  border-radius: 11px;
  background: #1c2127;
  box-shadow: 12px 12px 24px #181c21, -12px -12px 24px #20262d;
  color: ${Colors.DARK_GRAY3};
  font-size: 20px;
  user-select: none;

  @media (prefers-color-scheme: light) {
    display: none;
  }
`;
