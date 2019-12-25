import styled from 'styled-components';
import { Drawer } from '@blueprintjs/core';

export const StyledDrawer = styled(Drawer)`
.root {
  overflow: auto;
  padding: 5px 0;
  font-family: JetBrainsMono, monospace;
  font-size: 12px;
  font-weight: 300;
}
.clear {
  position: absolute;
  right: 15px;
  bottom: 15px;
  cursor: pointer;
  transition: all 333ms ease-in-out;
  opacity: .5;
  &:hover {
    opacity: 1;
  }
}
`;