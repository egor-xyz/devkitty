import { Classes, Icon, type IconName } from '@blueprintjs/core';
import { type FC } from 'react';
import { cn } from 'renderer/utils/cn';

type Props = {
  className?: string;
  icon?: IconName;
  label: string;
  onToggle: () => void;
};

// The one way this app folds a pile of finished things away: a rule across the
// row with the toggle in the middle. Used for passing checks and merged
// worktrees alike, so the gesture reads the same wherever it appears.
//
// The content sits at its natural width rather than in a fixed-width slot, and
// carries no state caret — what is folded is obvious from whether the rows
// below it are there, and the label stays put instead of resizing on every
// click.
export const FoldDivider: FC<Props> = ({ className, icon, label, onToggle }) => (
  <button
    className={cn(
      'flex items-center gap-3 w-full py-1.5 px-4 cursor-pointer select-none',
      'bg-transparent border-none',
      'hover:bg-bp-light-gray-3 dark:hover:bg-bp-dark-gray-2',
      Classes.TEXT_MUTED,
      className
    )}
    onClick={onToggle}
    type="button"
  >
    <span className="flex-1 h-px bg-bp-light-gray-1 dark:bg-bp-dark-gray-4" />

    <span className="flex items-center gap-1.5 shrink-0 text-[11px] whitespace-nowrap">
      {icon && (
        <Icon className="shrink-0"
          icon={icon}
          size={11}
        />
      )}

      {label}
    </span>

    <span className="flex-1 h-px bg-bp-light-gray-1 dark:bg-bp-dark-gray-4" />
  </button>
);
