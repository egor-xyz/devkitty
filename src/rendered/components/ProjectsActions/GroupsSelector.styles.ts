import { Colors, Icon } from '@blueprintjs/core';
import styled, { css } from 'styled-components';

import metalDark from './assets/metal-dark.jpg';
import metal from './assets/metal.jpg';
import metalActive from './assets/metal-active.jpg';

export const Root = styled.div<{ collapsed: boolean }>(
  ({ collapsed }) => css`
    display: flex;
    flex-direction: column;
    height: 90px;
    overflow: hidden;
    transition: height 0.3s ease 0s;

    ${collapsed &&
    css`
      height: 0;
    `}

    @media (prefers-color-scheme: dark) {
      background-color: ${Colors.DARK_GRAY3};
    }
  `
);

export const GroupsControl = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 0;

  @media (prefers-color-scheme: dark) {
    background: #000 url(${metalDark}) repeat-x left top;
  }
`;

export const Title = styled.div`
  align-items: center;
  margin-right: 20px;
  font-size: 24px;
`;

export const OldSchoolWrapper = styled.div`
  display: flex;
  box-sizing: content-box;
  justify-content: center;
  min-height: 44px;
  padding: 6px 8px;
  border-radius: 11px;
  background-image: url(${metal});
`;

export const OldSchoolButton = styled.div<{ active?: boolean }>(
  ({ active }) => css`
    display: block;
    width: 70px;
    height: 20px;
    margin: 0;
    padding: 0 10px 20px;
    float: left;
    overflow: hidden;
    background: #ddd url(${metal}) no-repeat center top;
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 20%), inset 0 0 1px 2px rgb(255 255 255 / 90%),
      inset 0 -6px 5px rgb(0 0 0 / 10%), 0 6px 7px rgb(0 0 0 / 30%), 0 4px 1px rgb(0 0 0 / 50%);
    color: #666;
    font-family: Aldrich, sans-serif;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 1px;
    line-height: 55px;
    text-align: left;
    text-overflow: ellipsis;
    text-shadow: 0 1px 1px rgb(255 255 255 / 80%);
    text-transform: uppercase;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    -webkit-touch-callout: none;

    &:first-child {
      border-radius: 8px 0 0 8px;
    }

    &:last-child {
      border-radius: 0 8px 8px 0;
    }

    ${active &&
    css`
      /* height: 50px; */
      margin-top: 2px;
      background-image: url(${metalActive});
      box-shadow: inset 0 0 0 1px rgb(0 0 0 / 18%), inset 0 0 1px 2px rgb(255 255 255 / 50%),
        inset 0 -6px 5px rgb(0 0 0 / 10%), 0 6px 7px rgb(0 0 0 / 30%), 0 2px 1px rgb(0 0 0 / 50%);
    `}
  `
);

export const StyledIcon = styled(Icon)`
  margin-right: 5px;
`;
