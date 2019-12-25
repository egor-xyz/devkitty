import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
to {
    max-height: 1000px;
    padding: 0 0 10px;
    opacity: 1;
  }
`;

const fadeOut = keyframes`
to {
    max-height: 0;
    padding: 0;
    opacity: 0;
  }
`;

export const Root = styled.div`
.title {
  position: relative;
  display: flex;
  align-items: center;
  margin: 10px 0;
  cursor: pointer;
  user-select: none;
  color: #182026;
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  .bp3-dark & {
    color: #f5f8fa;
  }
}
.leftIcon {
  margin-right: 10px;
}
.rightIcon {
  position: absolute;
  top: 50%;
  right: 0;
  margin-left: 10px * 2;
  transform: translate3d(0,-50%,0);
}
.block {
  max-height: 0;
  display: grid;
  overflow: hidden;
  align-items: center;
  padding: 0;
  animation: ${fadeOut} 333ms linear forwards;
  opacity: 0;

  grid-template-columns: 30% 70%;
  grid-column-gap: 10px;
  grid-row-gap: 10px;
  .bp3-code {
    max-height: 100px;
    overflow: auto !important;
    margin-left: 10px;
    padding: 10px;
    white-space: pre;
    line-height: 1.4;
  }
}
.oneColumn {
  display: block;
  .bp3-code {
    max-height: 300px;
    margin-left: 0;
  }
}
.block__active {
  animation: ${fadeIn} 333ms linear forwards;
}
.item {
  margin: 10px 0;
}
`;