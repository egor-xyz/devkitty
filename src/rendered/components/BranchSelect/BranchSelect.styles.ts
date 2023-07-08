import { Button, Classes, Colors, MenuItem } from '@blueprintjs/core';
import styled, { createGlobalStyle } from 'styled-components';

// Styles for the popover (portal)
export const GlobalStyles = createGlobalStyle`
  .branchSelectPopoverList .${Classes.MENU} {
    max-height: 295px;
    overflow: auto;
  }
`;

export const SelectButton = styled(Button)`
  display: flex;
  justify-content: space-between;
  width: 240px;
  border-radius: 6px;

  .${Classes.BUTTON_TEXT} {
    max-width: calc(100% - 10px);
    margin-left: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export const StyledMenuItem = styled(MenuItem)`
  max-width: 230px;
`;
