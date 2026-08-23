import { Tooltip } from '@blueprintjs/core';
import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from 'renderer/utils/cn';
import { type ClaudeAccount } from 'types/claudeUsage';

type Props = {
  accounts: ClaudeAccount[];
  activeDir?: string;
  onSelect: (dir: string) => void;
};

export const AccountPills = ({ accounts, activeDir, onSelect }: Props) => {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  const activeIndex = Math.max(
    0,
    accounts.findIndex((a) => a.dir === activeDir)
  );

  // Measure the active button so the glass slides to exactly where it sits,
  // regardless of the tooltip wrappers around each one.
  useLayoutEffect(() => {
    const el = buttons.current[activeIndex];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeIndex, accounts.length]);

  // Nothing to switch between with a single account.
  if (accounts.length < 2) return null;

  return (
    <div className="relative flex items-center gap-1">
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-0 h-6 rounded-[8px] border border-white/40',
          'bg-gradient-to-b from-white/35 to-white/10',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-1px_2px_rgba(255,255,255,0.15),0_2px_6px_rgba(0,0,0,0.28)]'
        )}
        style={{
          backdropFilter: 'url(#dk-liquid-glass) saturate(1.8) brightness(1.08)',
          transform: `translateX(${indicator.left}px)`,
          transition: 'transform 0.45s cubic-bezier(0.34, 1.4, 0.5, 1), width 0.45s cubic-bezier(0.34, 1.4, 0.5, 1)',
          WebkitBackdropFilter: 'url(#dk-liquid-glass) saturate(1.8) brightness(1.08)',
          width: indicator.width
        }}
      />

      {accounts.map((account, i) => {
        const active = account.dir === activeDir;

        return (
          <Tooltip
            content={
              <div className="flex flex-col gap-0.5 px-0.5 py-px">
                <span className="text-xs font-semibold">{account.org ?? account.label}</span>
                {account.email && <span className="text-[11px] opacity-80">{account.email}</span>}
                {account.plan && <span className="text-[11px] opacity-70">{account.plan}</span>}
              </div>
            }
            hoverOpenDelay={2000}
            key={account.dir}
            placement="top"
            usePortal={false}
          >
            <button
              className={cn(
                'app-region-no-drag relative z-10 flex h-6 w-6 items-center justify-center rounded-[7px] text-[11px] font-semibold tabular-nums transition-colors',
                active
                  ? 'text-bp-dark-gray-1 dark:text-white'
                  : 'text-bp-gray-1 hover:text-bp-dark-gray-1 dark:text-white/55 dark:hover:text-white/85'
              )}
              onClick={() => onSelect(account.dir)}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              type="button"
            >
              {i + 1}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
};
