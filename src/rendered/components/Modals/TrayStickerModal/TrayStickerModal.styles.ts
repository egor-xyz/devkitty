import { Colors, Dialog } from '@blueprintjs/core';
import styled from 'styled-components';

export const StyledDialog = styled(Dialog)`
  max-width: 250px;
`;

export const Actions = styled.div`
  display: flex;
  align-items: center;
  margin-top: 10px;
  justify-content: space-between;
  flex-direction: row-reverse;
`;

export const Error = styled.div`
  color: ${Colors.RED3};
  font-size: 12px;
`;
