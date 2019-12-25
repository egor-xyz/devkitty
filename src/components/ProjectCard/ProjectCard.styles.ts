import styled from 'styled-components';
import { Card } from '@blueprintjs/core';

export const StyledCard = styled(Card)`
display: flex;
justify-content: space-around;
margin: 2px 0;
padding: 0;
border-radius: 0;
.block {
  width: 100%;
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  justify-content: center;
  padding: 7px;
  text-align: left;
  &:first-child {
    padding-left: 20px;
  }
  &:last-child {
    align-items: flex-end;
  }
}
.block_button {
  button {
    width: 310px;
    justify-content: space-between;
    white-space: nowrap;
    span {
      max-width: 90%;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}
.block_select {
  align-items: center;
  flex-direction: row;
  min-width: 395px;
  justify-content: flex-start;
}
.block_text {
  min-width: 250px;
  padding: 0 10px;
}
.buttonGroup {
  margin-left: 8px;
}
.name {
  cursor: pointer;
}
.info {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  margin-top: 4px;
  & > * {
    margin-left: 8px;
    &:first-child {
      margin-left: 0;
    }
  }
}
.mr {
  margin-right: 8px;
}
.ml {
  margin-left: 8px;
}
`;