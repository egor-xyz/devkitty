import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { useAppSettings, useIsSunset } from 'renderer/hooks/useAppSettings';
import { useClaudeUsage, useClaudeUsagePolling } from 'renderer/hooks/useClaudeUsage';
import { cn } from 'renderer/utils/cn';

import { AccountPills } from './AccountPills';
import { ClaudeMark } from './ClaudeMark';
import { UsageMeter } from './UsageMeter';

export const ClaudeFooter = () => {
  const { showClaudeUsage } = useAppSettings();
  const isSunset = useIsSunset();
  const accounts = useClaudeUsage((s) => s.accounts);
  const activeDir = useClaudeUsage((s) => s.activeDir);
  const usage = useClaudeUsage((s) => s.usage);
  const loading = useClaudeUsage((s) => s.loading);
  const setActive = useClaudeUsage((s) => s.setActive);

  // Hidden on the Settings page, but the panel stays mounted and slides down
  // (rather than unmounting) so the hide animates.
  const onSettings = useLocation().pathname.startsWith('/settings');
  const visible = showClaudeUsage && !onSettings;

  useClaudeUsagePolling();

  // A slow clock so the reset countdowns advance without re-reading the disk.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  // Stay mounted so the panel can slide down on hide; accounts absent means the
  // feature simply isn't available.
  if (accounts.length === 0) return null;

  return (
    <footer
      className={cn(
        'app-region-no-drag fixed bottom-0 left-0 right-0 z-10 flex h-11 select-none items-center gap-3.5 px-4',
        isSunset
          ? 'devkitty-footer-glass'
          : 'border-t border-bp-light-gray-1 bg-bp-light-gray-4 dark:border-bp-dark-gray-2 dark:bg-bp-dark-gray-1',
        'transition-transform duration-300 ease-out',
        visible ? 'translate-y-0' : 'pointer-events-none translate-y-full'
      )}
    >
      {/* Refraction filter for the liquid-glass account switcher (Chromium/Electron
          supports SVG filters as backdrop-filter). */}
      <svg
        aria-hidden
        className="pointer-events-none absolute h-0 w-0"
      >
        <filter
          colorInterpolationFilters="sRGB"
          height="180%"
          id="dk-liquid-glass"
          width="180%"
          x="-40%"
          y="-40%"
        >
          <feTurbulence
            baseFrequency="0.02 0.02"
            numOctaves={2}
            result="noise"
            seed={7}
            type="fractalNoise"
          />

          <feGaussianBlur
            in="noise"
            result="smooth"
            stdDeviation={1.5}
          />

          <feDisplacementMap
            in="SourceGraphic"
            in2="smooth"
            scale={9}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      <ClaudeMark
        className="shrink-0 text-[#D97757]"
        size={16}
        spin={loading}
      />

      <AccountPills
        accounts={accounts}
        activeDir={activeDir}
        onSelect={setActive}
      />

      {accounts.length > 1 && <div className="h-5 w-px shrink-0 bg-bp-light-gray-1 dark:bg-bp-dark-gray-3" />}

      {usage ? (
        <div className="flex flex-1 items-center gap-4">
          <div className="flex-1">
            <UsageMeter
              label="7D"
              now={now}
              reportedAt={usage.reportedAt}
              title="Last 7 days"
              window={usage.week}
            />
          </div>

          <div className="h-5 w-px shrink-0 bg-bp-light-gray-1 dark:bg-bp-dark-gray-3" />

          <div className="flex-1">
            <UsageMeter
              label="5H"
              now={now}
              reportedAt={usage.reportedAt}
              title="5-hour session"
              window={usage.fiveHour}
            />
          </div>
        </div>
      ) : (
        <span className="flex-1 text-xs text-bp-gray-2">Reading usage…</span>
      )}
    </footer>
  );
};
