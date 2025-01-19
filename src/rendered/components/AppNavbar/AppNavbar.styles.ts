import { Colors, Navbar } from '@blueprintjs/core';
import styled from 'styled-components';
import Devkitty from 'rendered/assets/devkitty.svg?react';

export const StyledNavbar = styled(Navbar)`
  -webkit-app-region: drag;
  background-color: ${Colors.LIGHT_GRAY4} !important;
  user-select: none;
  box-shadow: none !important;
  overflow: hidden;

  @media (prefers-color-scheme: dark) {
    background-color: ${Colors.DARK_GRAY1} !important;
    border-bottom: 1px solid ${Colors.DARK_GRAY2};
  }
`;

export const LeftGroup = styled(Navbar.Group)`
  -webkit-app-region: no-drag;
  margin-left: 70px;
  overflow: hidden;
`;

export const Title = styled.div`
  -webkit-app-region: drag;
  margin-left: 5px;
  font-size: 18px;
  user-select: none;
  pointer-events: none;

  @media (prefers-color-scheme: dark) {
    margin-left: -42px;
    color: ${Colors.DARK_GRAY3};
  }
`;

export const ShadowContainer = styled.div`
  overflow: hidden;
  position: relative;
  height: 50px;
  width: 100px;
  pointer-events: none;
  margin-left: -25px;
  z-index: -1;

  @media (prefers-color-scheme: light) {
    display: none;
  }
`;

export const Shadow = styled.div`
  width: 0;
  height: 48px;
  background-color: transparent;
  border-left: 49px solid transparent;
  border-bottom: 100px solid ${Colors.DARK_GRAY1};
  filter: drop-shadow(0px 7px 14px rgba(0, 0, 0, 0.9));
  transform: rotate(180deg);
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
