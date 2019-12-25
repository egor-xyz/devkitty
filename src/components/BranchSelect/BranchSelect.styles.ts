import styled from 'styled-components';
import { MenuItem } from '@blueprintjs/core';

export const Root = styled.div`
  .bp3-popover-arrow {
    display: none !important;
  }
`;

export const StyledMenuItem = styled(MenuItem)`
  width: 240px;
  z-index: 1;
  padding: 4px;
  cursor: pointer;
  .bp3-icon-trash {
    color: #db3737 !important;
  }
  &:last-child {
    border-radius: 0;
  }
  strong {
    color: #f55656;
  }
  &.itemNew {
    @extend .item;
    position: relative;
  }
  &.infoFirst:not(.readonly) {
    &:before {
      min-width: 50px;
      position: absolute;
      z-index: -1;
      top: calc(50% + 15px);
      right: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px 8px 10px;
      content: attr(data-info);
      transition: 333ms ease-in-out;
      transform: translate3d(50%, -50%, 0) rotate(-90deg);
      transform-origin: center center !important;
      white-space: nowrap;
      color: #182026 !important;
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
      background-color: #f5f8fa;
      box-shadow: 0 8px 24px rgba(16, 22, 26, .2), 0 2px 4px rgba(16, 22, 26, .2), 0 0 0 1px rgba(16, 22, 26, .1);
      font-family: JetBrainsMono, monospace;
      font-size: 14px;
  
      .bp3-dark & {
        color: #f5f8fa !important;
        background-color: #293742;
      }
    }
  }
  
  &.infoFirstHidden {
    &:before {
      transform: translate3d(100%, -50%, 0) rotate(-90deg);
    }
  }
  
  &.help:not(.readonly) {
    &:after {
      width: 100%;
      position: absolute;
      z-index: -1;
      top: calc(100% - 6px);
      left: 0;
      padding: 8px 0 2px;
      content: 'COPY: ⌘-click, DEL ⌥-click';
      cursor: default;
      transition: 333ms ease-in-out;
      text-align: center;
      pointer-events: none;
      color: #182026 !important;
      border-bottom-right-radius: 12px;
      border-bottom-left-radius: 12px;
      background-color: #f5f8fa;
      box-shadow: 0 0 0 1px rgba(16, 22, 26, .1), 0 2px 4px rgba(16, 22, 26, .2), 0 8px 24px rgba(16, 22, 26, .2);
      font-family: JetBrainsMono, monospace;
      font-size: 12px;
  
      .bp3-dark & {
        color: #f5f8fa !important;
        background-color: #293742;
      }
  
      .bottom & {
        display: none;
      }
    }
  }
  
  &.helpHidden {
    &:after {
      transform: translate3d(0, -110%, 0);
    }
  }
`;