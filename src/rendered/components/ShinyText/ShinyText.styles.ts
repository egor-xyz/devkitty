import styled, { keyframes } from 'styled-components';

const shine = keyframes`
  0% {
    background-position: 100%;
  }
  100% {
    background-position: -100%;
  }
`;

export const Root = styled.span<{ speed: number }>`
  color: #b5b5b5a4;
  display: inline-block;
  background: linear-gradient(
    120deg,
    rgba(255, 255, 255, 0) 40%,
    rgba(255, 255, 255, 0.8) 50%,
    rgba(255, 255, 255, 0) 60%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  animation: ${shine} 5s linear infinite;
  animation-duration: ${({ speed }) => `${speed}s`};

  @media (prefers-color-scheme: light) {
    display: none;
  }
`;
