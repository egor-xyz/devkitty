import styled from 'styled-components';

export const Root = styled.div`
.raw {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.select {
  button {
    width: 200px;
    white-space: nowrap;
    justify-content: space-between;
    span {
      max-width: 90%;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}
.icon {
  margin: 0 10px;
}
.item {
  cursor: pointer;
}
.progress {
  color: #5c7080;
  cursor: default;
  .bp3-dark & {
    color: #a7b6c2;
  }
}
.progress_status {
  margin-top: 10px;
  font-size: 14px;
  display: flex;
  justify-content: center;
  align-items: center;
  span + span {
    margin-left: 10px;
  }
}
`;