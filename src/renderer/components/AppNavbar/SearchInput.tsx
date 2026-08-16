import { Icon } from '@blueprintjs/core';
import { type FC, type RefObject } from 'react';
import { cn } from 'renderer/utils/cn';

type Props = {
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
  onClear: () => void;
  value: string;
};

// Hand-rolled rather than a Blueprint InputGroup: the navbar wants a compact
// pill that grows on focus, and every part of that fought the component's own
// height, border and icon sizing.
export const SearchInput: FC<Props> = ({ inputRef, onChange, onClear, value }) => (
  <div
    className={cn(
      'group flex items-center h-[26px] gap-1.5 pl-2.5 pr-1 rounded-full box-border',
      'border border-bp-light-gray-1 dark:border-bp-dark-gray-4',
      'bg-bp-light-gray-5 dark:bg-bp-dark-gray-2',
      'hover:border-bp-gray-4 dark:hover:border-bp-dark-gray-5',
      'focus-within:border-bp-gray-3 dark:focus-within:border-bp-gray-2',
      'focus-within:shadow-[0_0_0_3px_rgba(143,153,168,0.15)]',
      'w-[140px] focus-within:w-[220px] transition-all duration-200 ease-out'
    )}
  >
    <Icon
      className="text-bp-gray-2 dark:text-bp-gray-3 shrink-0"
      icon="search"
      size={12}
    />

    <input
      className={cn(
        'flex-1 min-w-0 bg-transparent border-none outline-none p-0 text-xs leading-none',
        'text-black dark:text-bp-light-gray-5',
        'placeholder:text-bp-gray-2 dark:placeholder:text-bp-gray-3'
      )}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Filter…"
      ref={inputRef}
      type="text"
      value={value}
    />

    {/* Holds the slot open so the input does not jump when the button appears. */}
    <button
      className={cn(
        'flex items-center justify-center w-[18px] h-[18px] shrink-0 rounded-full',
        'bg-transparent border-none cursor-pointer p-0',
        'text-bp-gray-2 dark:text-bp-gray-3',
        'hover:bg-bp-light-gray-2 dark:hover:bg-bp-dark-gray-4',
        !value && 'invisible'
      )}
      onClick={onClear}
      tabIndex={value ? 0 : -1}
      type="button"
    >
      <Icon icon="cross"
        size={10}
      />
    </button>
  </div>
);
