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
  const [indicator, setIndicator] = useState<{ height: number; left: number; top: number; width: number }>({
    height: 0,
    left: 0,
    top: 0,
    width: 0
  });

  const activeIndex = Math.max(
    0,
    accounts.findIndex((a) => a.dir === activeDir)
  );

  // Measure the active button's exact box so the glass sits precisely on it —
  // matching top/height too, not just left/width, keeps the digit centred.
  useLayoutEffect(() => {
    const el = buttons.current[activeIndex];
    if (el) setIndicator({ height: el.offsetHeight, left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth });
  }, [activeIndex, accounts.length]);

  // Nothing to switch between with a single account.
  if (accounts.length < 2) return null;

  return (
    <div className="relative flex items-center gap-1 rounded-[10px] bg-black/20 p-0.5 ring-1 ring-white/10">
      {/* Liquid-glass pill that slides under the active account. The refraction
          comes from the #dk-liquid-glass SVG filter used as a backdrop-filter;
          the layered highlights give it a wet, domed look. */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute left-0 top-0 rounded-[8px] border border-white/45',
          'bg-gradient-to-b from-white/40 via-white/15 to-white/5',
          'shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.85),inset_0_-2px_3px_rgba(255,255,255,0.12),inset_0_0_8px_rgba(197,138,214,0.25),0_2px_8px_rgba(0,0,0,0.35)]'
        )}
        style={{
          backdropFilter: 'url(#dk-liquid-glass) saturate(1.9) brightness(1.1)',
          height: indicator.height,
          transform: `translate(${indicator.left}px, ${indicator.top}px)`,
          transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.5, 1), width 0.5s cubic-bezier(0.34, 1.56, 0.5, 1)',
          WebkitBackdropFilter: 'url(#dk-liquid-glass) saturate(1.9) brightness(1.1)',
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
                'app-region-no-drag relative z-10 flex h-6 w-6 items-center justify-center rounded-[7px] text-[11px] font-semibold tabular-nums transition-colors duration-300',
                active
                  ? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]'
                  : 'text-white/55 hover:text-white/85'
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
