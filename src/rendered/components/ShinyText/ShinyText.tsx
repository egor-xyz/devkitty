import type { FC } from 'react';

import { cn } from 'rendered/utils/cn';

type Props = {
  className?: string;
  speed?: number;
  text: string;
};

export const ShinyText: FC<Props> = ({ className, speed = 5, text }) => (
  <span
    className={cn('hidden dark:inline-block text-[#b5b5b5a4] shiny-text animate', className)}
    style={{ animationDuration: `${speed}s` }}
  >
    {text}
  </span>
);
