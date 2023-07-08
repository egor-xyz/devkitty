import styled from 'styled-components';
import { DialogBody } from '@blueprintjs/core';

import { BranchSelect } from 'rendered/components/BranchSelect';

export const StyledDialogBody = styled(DialogBody)`
  user-select: none;
`;

export const StyledBranchSelect = styled(BranchSelect)`
  flex: 2;
  margin-bottom: 15px;
`;
