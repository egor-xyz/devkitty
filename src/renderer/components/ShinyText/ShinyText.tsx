import type { FC } from 'react';

import { cn } from 'renderer/utils/cn';

type Props = {
  className?: string;
  text: string;
};

export const ShinyText: FC<Props> = ({ className, text }) => (
  <span
    className={cn('hidden dark:inline-block text-[#b5b5b5a4]', className)}
  >
    {text}
  </span>
);
