import styled from 'styled-components';

export const Root = styled.div`
display: flex;
padding: 5px 10px;
justify-content: left;
align-items: center;
border: none !important;
& + & {
  border-top: 1px solid hsla(0, 0%, 80%, 0.19) !important;
}
.date {
  min-width: 170px;
  text-align: center;
}
.text {
  padding-left: 10px;
}
`;