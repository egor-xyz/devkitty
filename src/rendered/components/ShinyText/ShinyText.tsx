import type { FC } from 'react';

import { Root } from './ShinyText.styles';

type Props = {
  className?: string;
  speed?: number;
  text: string;
};

export const ShinyText: FC<Props> = ({ className, speed = 5, text }) => (
  <Root
    className={className}
    speed={speed}
  >
    {text}
  </Root>
);
