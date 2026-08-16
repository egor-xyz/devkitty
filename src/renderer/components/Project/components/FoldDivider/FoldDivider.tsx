import { Classes } from '@blueprintjs/core';
import { type FC } from 'react';
import { cn } from 'renderer/utils/cn';

type Props = {
  hideLabel: string;
  onToggle: () => void;
  open: boolean;
  showLabel: string;
};

// The one way this app folds a pile of finished things away: a full-width rule
// with the toggle in the middle. Used for successful checks and merged
// checkouts alike, so the gesture reads the same wherever it appears.
export const FoldDivider: FC<Props> = ({ hideLabel, onToggle, open, showLabel }) => (
  <button
    className={cn(
      'flex items-center gap-3 w-full py-1.5 px-4 cursor-pointer select-none',
      'bg-transparent border-none',
      'hover:bg-bp-light-gray-4 dark:hover:bg-bp-dark-gray-2',
      Classes.TEXT_MUTED
    )}
    onClick={onToggle}
    type="button"
  >
    <span className="flex-1 h-px bg-bp-light-gray-1 dark:bg-bp-dark-gray-4" />
    <span className="text-[11px] whitespace-nowrap">{open ? hideLabel : showLabel}</span>
    <span className="flex-1 h-px bg-bp-light-gray-1 dark:bg-bp-dark-gray-4" />
  </button>
);
