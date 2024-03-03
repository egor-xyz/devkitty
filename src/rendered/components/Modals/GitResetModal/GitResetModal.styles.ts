import styled from 'styled-components';
import { DialogBody } from '@blueprintjs/core';

import { BranchSelect } from 'rendered/components/BranchSelect';

export const StyledDialogBody = styled(DialogBody)`
  user-select: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const Options = styled.div`
  display: flex;
  gap: 30px;
  align-items: center;
`;

export const Row = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 30px;
  align-items: center;
`;

export const StyledBranchSelect = styled(BranchSelect)`
  flex: 3;
  max-width: 300px;
`;
