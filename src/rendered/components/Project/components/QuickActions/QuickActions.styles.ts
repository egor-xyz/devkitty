import styled from 'styled-components';
import { FaRegCopy, FaCopy } from 'react-icons/fa';
import { Colors } from '@blueprintjs/core';

export const StyledFaRegCopy = styled(FaRegCopy)`
  color: ${Colors.GRAY1};
  @media (prefers-color-scheme: dark) {
    color: ${Colors.GRAY4};
  }
`;

export const StyledFaCopy = styled(FaCopy)`
  color: ${Colors.GRAY1};
  @media (prefers-color-scheme: dark) {
    color: ${Colors.GRAY4};
  }
`;
