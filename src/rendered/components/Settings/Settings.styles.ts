import { Colors } from '@blueprintjs/colors';
import { Classes } from '@blueprintjs/core';
import { GitHubIcon } from 'rendered/assets/gitHubIcons';
import styled from 'styled-components';

export const Root = styled.div`
  height: calc(100vh - 50px);
  .${Classes.TABS} {
    height: 100%;
  }
  .${Classes.TAB_LIST} {
    padding-top: 14px;
    border-right: 1px solid ${Colors.LIGHT_GRAY3};
    @media (prefers-color-scheme: dark) {
      border-right: 1px solid ${Colors.DARK_GRAY3};
    }
  }
  .${Classes.TAB_PANEL} {
    width: 100%;
    padding: 0 10px 10px 10px;

    .${Classes.DIVIDER} {
      margin: 10px 0;
    }
  }
`;

export const StyledActionsIcon = styled(GitHubIcon)`
  margin-right: 6px;
  width: 16px;
  height: 16px;
`;
