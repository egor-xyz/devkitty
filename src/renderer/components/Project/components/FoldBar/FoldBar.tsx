import { Classes, Icon, type IconName } from '@blueprintjs/core';
import { type FC, type ReactNode } from 'react';
import { cn } from 'renderer/utils/cn';

type ChipProps = {
  icon?: IconName;
  label: string;
  onToggle: () => void;
};

// One fold, one chip. Every pile a checkout can fold away used to own a full
// row with its own pair of rules, which stacked four deep on a busy card and
// pushed the actual checkouts off screen.
export const FoldChip: FC<ChipProps> = ({ icon, label, onToggle }) => (
  <button
    className={cn(
      'flex items-center gap-1 h-[22px] px-2 shrink-0 rounded-full cursor-pointer select-none',
      'border border-bp-light-gray-1 dark:border-bp-dark-gray-4 bg-transparent',
      'text-[11px] whitespace-nowrap',
      'hover:bg-bp-light-gray-2 dark:hover:bg-bp-dark-gray-3',
      Classes.TEXT_MUTED
    )}
    onClick={onToggle}
    type="button"
  >
    {icon && (
      <Icon className="shrink-0"
        icon={icon}
        size={11}
      />
    )}

    {label}
  </button>
);

type Props = {
  children: ReactNode;
  className?: string;
};

// The rules survive from the old divider — they are what makes a fold read as a
// seam between two piles rather than as a toolbar.
export const FoldBar: FC<Props> = ({ children, className }) => (
  <div className={cn('flex items-center gap-2 py-1.5 px-4', className)}>
    <span className="flex-1 h-px bg-bp-light-gray-1 dark:bg-bp-dark-gray-4" />
    <div className="flex items-center gap-1.5 shrink-0">{children}</div>
    <span className="flex-1 h-px bg-bp-light-gray-1 dark:bg-bp-dark-gray-4" />
  </div>
);
