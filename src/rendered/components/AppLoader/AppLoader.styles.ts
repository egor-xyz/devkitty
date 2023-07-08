import styled, { css, keyframes } from 'styled-components';

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const glowing = css`
  animation: ${spin} 0.5s linear infinite;
  background: var(--linear-gradient);

  &::before {
    background-color: var(--code-gray);
  }

  & span {
    filter: blur(5px);
  }

  & span:nth-child(2) {
    filter: blur(10px);
  }

  & span:nth-child(3) {
    filter: blur(25px);
  }

  & span:last-child {
    filter: blur(50px);
  }
`;

export const Root = styled.div`
  --code-gray: #091921;
  --linear-gradient: linear-gradient(#14ffe9, #ffeb3b, #ff00e0);
  --mardi-grass: #240229;

  position: fixed;
  top: calc(50% - 75px + 25px);
  left: calc(50% - 75px);
  width: 150px;
  height: 150px;
  animation: ${spin} 0.5s linear infinite;
  border-radius: 50%;
  background: var(--linear-gradient);

  &::before {
    content: '';
    position: absolute;
    z-index: 1;
    inset: 1.56rem;
    border-radius: 50%;
    background-color: var(--code-gray);
  }

  span {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: var(--linear-gradient);
    filter: blur(5px);
  }

  ${glowing}
`;
