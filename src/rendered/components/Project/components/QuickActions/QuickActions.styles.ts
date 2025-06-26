import { Colors } from '@blueprintjs/core';
import { FaCopy, FaRegCopy } from 'react-icons/fa';
import styled from 'styled-components';

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
