import { Icon } from '@blueprintjs/core';
import { type FC, type RefObject } from 'react';
import { useIsSunset } from 'renderer/hooks/useAppSettings';
import { cn } from 'renderer/utils/cn';

// Gentle keycap: smaller than the search icon, low-contrast, thin border.
const kbdClass = (isSunset: boolean) =>
  cn(
    'inline-flex items-center justify-center h-[15px] min-w-[15px] px-1 rounded-[4px] border text-[10px] leading-none font-medium',
    isSunset
      ? 'border-white/15 bg-white/5 text-black/55 dark:text-white/55'
      : 'border-bp-light-gray-1 bg-black/[0.03] text-bp-gray-2 dark:border-white/10 dark:bg-white/5 dark:text-white/50'
  );

type Props = {
  inputRef: RefObject<HTMLInputElement | null>;
  label?: string;
  onActivate?: () => void;
  onChange?: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  readOnly?: boolean;
  value?: string;
};

// Hand-rolled rather than a Blueprint InputGroup: the navbar wants a compact
// pill that grows on focus, and every part of that fought the component's own
// height, border and icon sizing.
export const SearchInput: FC<Props> = ({ inputRef, label, onActivate, onChange, onClear, placeholder = 'Filter…', readOnly, value = '' }) => {
  const isSunset = useIsSunset();
  // Opener mode: nothing but the centred ⌘K hint. It gets a compact pill with
  // symmetric padding and no clear button, so the hint sits dead centre.
  const isOpener = readOnly && !label;

  return (
    <div
      className={cn(
        'group flex items-center h-[26px] gap-2 rounded-full box-border',
        isOpener ? 'px-2' : 'pl-3.5 pr-1.5',
        isSunset
          ? 'backdrop-blur-sm border border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/10 hover:border-black/20 dark:hover:border-white/25 focus-within:border-black/30 dark:focus-within:border-white/40 focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.12)]'
          : 'border border-bp-light-gray-1 dark:border-bp-dark-gray-4 bg-bp-light-gray-5 dark:bg-bp-dark-gray-2 hover:border-bp-gray-4 dark:hover:border-bp-dark-gray-5 focus-within:border-bp-gray-3 dark:focus-within:border-bp-gray-2 focus-within:shadow-[0_0_0_3px_rgba(143,153,168,0.15)]',
        'transition-all duration-200 ease-out',
        // A selected worktree name is long, so the pill is wide when it holds a
        // label; otherwise it stays compact and grows on focus.
        readOnly ? (label ? 'w-fit max-w-[280px] cursor-pointer' : 'w-[86px] cursor-pointer') : 'w-[140px] focus-within:w-[220px]'
      )}
      // Opener mode: the pill is a button that opens the command palette.
      // Use mousedown + preventDefault so the input never takes focus (which
      // would fight the palette's own focus and loop on close).
      onMouseDown={
        readOnly
          ? (event) => {
              event.preventDefault();
              onActivate?.();
            }
          : undefined
      }
    >
      {/* Search icon only in the live filter input. The ⌘K opener shows just
          the centred keycap hint, and a focused repo/worktree shows just its
          name — no icon in either. */}
      {!readOnly && (
        <Icon
          className={cn(isSunset ? 'text-bp-gray-2 dark:text-white/50 shrink-0' : 'text-bp-gray-2 dark:text-bp-gray-3 shrink-0')}
          icon="search"
          size={12}
        />
      )}

      {readOnly ? (
        label ? (
          // Focused mode: show the selected repo name in the header pill.
          <span
            className={cn(
              'flex flex-1 items-center min-w-0 text-xs font-medium leading-none pointer-events-none',
              isSunset ? 'text-black dark:text-white' : 'text-black dark:text-bp-light-gray-5'
            )}
          >
            <span className="truncate">{label}</span>
          </span>
        ) : (
          // Opener mode: ⌘ as a gentle keycap, "+ K" as plain muted text, all
          // on one vertically-centred line, smaller than the search icon.
          <span
            className={cn(
              'flex flex-1 items-center justify-center gap-1 pointer-events-none text-[10px] leading-none',
              isSunset ? 'text-bp-gray-2/80 dark:text-white/45' : 'text-bp-gray-2 dark:text-white/45'
            )}
          >
            <kbd className={kbdClass(isSunset)}>⌘</kbd>
            <span>+ K</span>
          </span>
        )
      ) : (
        <input
          className={cn(
            'flex-1 min-w-0 bg-transparent border-none outline-none p-0 text-xs leading-none',
            isSunset ? 'text-black dark:text-white' : 'text-black dark:text-bp-light-gray-5',
            isSunset ? 'placeholder:text-bp-gray-2 dark:placeholder:text-white/50' : 'placeholder:text-bp-gray-2 dark:placeholder:text-bp-gray-3'
          )}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          ref={inputRef}
          type="text"
          value={value}
        />
      )}

      {/* Holds the slot open so the input does not jump when the button appears.
          Omitted in opener mode, which has nothing to clear and must stay
          compact and centred. */}
      {!isOpener && (
        <button
          aria-label={readOnly ? 'Clear selection' : 'Clear filter'}
          className={cn(
          'flex items-center justify-center w-[18px] h-[18px] shrink-0 rounded-full',
          'bg-transparent border-none cursor-pointer p-0',
          isSunset ? 'text-bp-gray-2 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/15' : 'text-bp-gray-2 dark:text-bp-gray-3 hover:bg-bp-light-gray-2 dark:hover:bg-bp-dark-gray-4',
          !(readOnly ? label : value) && 'invisible'
        )}
          onClick={onClear}
        // Stop the pill's mousedown-to-open handler so clearing does not also
        // open the palette.
          onMouseDown={(event) => event.stopPropagation()}
          tabIndex={(readOnly ? label : value) ? 0 : -1}
          type="button"
        >
          <Icon icon="cross"
            size={10}
          />
        </button>
      )}
    </div>
  );
};
