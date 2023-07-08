import { Colors, Navbar } from '@blueprintjs/core';
import styled, { keyframes } from 'styled-components';

import Devkitty from 'rendered/assets/devKitty.svg';

export const StyledNavbar = styled(Navbar)`
  -webkit-app-region: drag;
  background-color: ${Colors.LIGHT_GRAY4} !important;
  user-select: none;

  @media (prefers-color-scheme: dark) {
    background-color: ${Colors.DARK_GRAY1} !important;
  }
`;

export const LeftGroup = styled(Navbar.Group)`
  -webkit-app-region: no-drag;
  margin-left: 70px;
  overflow: hidden;
`;

export const TextDivider = styled.div`
  margin: 0 15px 0 18px;
  transform: rotate(45deg);

  @media (prefers-color-scheme: dark) {
    margin: 0 15px 0 18px;
    height: 200%;
    transform: rotate(45deg);
    border-left: 1px solid ${Colors.DARK_GRAY5};
    box-shadow: rgba(240, 46, 170, 0.4) 5px 5px, rgba(240, 46, 170, 0.3) 10px 10px, rgba(240, 46, 170, 0.2) 15px 15px,
      rgba(240, 46, 170, 0.1) 20px 20px, rgba(240, 46, 170, 0.05) 25px 25px;
  }
`;

const textclip = keyframes`
  to {
    background-position: 200% center;
  }
`;

export const Heading = styled(Navbar.Heading)`
  text-transform: uppercase;
  background-image: linear-gradient(-225deg, #fa0161 0%, #ffd900 29%, #ff1361 67%, #fff800 100%);
  background-size: auto auto;
  background-clip: border-box;
  background-size: 200% auto;
  color: #fff;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: ${textclip} 10s linear infinite reverse;
`;

export const RightGroup = styled(Navbar.Group)`
  -webkit-app-region: no-drag;
  margin-left: 70px;
  button + button,
  button + a {
    margin-left: 8px;
  }
`;

export const Logo = styled(Devkitty)`
  height: 28px;

  &:hover {
    .cat,
    .tail {
      fill: url(#linear-gradient);
    }
  }

  @media (prefers-color-scheme: dark) {
    .cat,
    .tail {
      fill: ${Colors.GRAY3};
    }
  }
`;
