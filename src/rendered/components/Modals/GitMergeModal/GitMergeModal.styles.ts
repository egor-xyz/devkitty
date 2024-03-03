import styled from 'styled-components';

import { BranchSelect } from 'rendered/components/BranchSelect';

export const RepoInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: left;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
  gap: 5px;
`;

export const LightText = styled.span`
  font-weight: 300;
`;

export const CurrentBranch = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
`;

export const MergeTo = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20px 0;
  gap: 10px;
`;

export const StyledBranchSelect = styled(BranchSelect)`
  flex: 2;
`;

export const Force = styled.div`
  margin-top: 20px;
`;
