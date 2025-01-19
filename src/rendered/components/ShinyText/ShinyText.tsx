import type { FC } from 'react';
import { Root } from './ShinyText.styles';

type Props = {
  text: string;
  speed?: number;
  className?: string;
};

export const ShinyText: FC<Props> = ({ text, speed = 5, className }) => (
  <Root
    speed={speed}
    className={className}
  >
    {text}
  </Root>
);
