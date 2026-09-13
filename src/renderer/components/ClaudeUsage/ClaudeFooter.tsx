import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SiOpenai } from 'react-icons/si';
import { useLocation } from 'react-router';
import { AI_PROVIDER_CONFIG, AI_PROVIDERS, aiAccountKey, useAIUsage } from 'renderer/hooks/useAIUsage';
import { useAppSettings, useIsSunset } from 'renderer/hooks/useAppSettings';
import { cn } from 'renderer/utils/cn';
import { type AIProvider } from 'types/aiUsage';

import { AccountPills } from './AccountPills';
import { SpendMeter, UsageMeter } from './UsageMeter';

const ClaudeCodeMark = () => (
  <svg aria-hidden
    fill="currentColor"
    height={16}
    viewBox="0 0 24 24"
    width={16}
  ><path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-8.093-.34L0 11.784l.535-.673 8.585.673h.389l.055-.157-7.207-4.85-.364-.462-.158-1.008.656-.722 7.488 5.622.145-.103-3.695-7.051L6.283.134 6.696 0l.996.134 4.296 8.937h.158l1.11-8.227.747-.492.584.28.48.685-1.766 8.14h.212l5.461-6.336h1.033l.76 1.129-5.472 7.31.188-.02 6.073-1.12.833.388.091.395-.328.807-6.766 1.599-.042.03.049.061 6.853.407.79.522.474.638-.079.485-1.215.62-7.758-1.628h-.182v.11l6.217 5.208.127.578-.322.455-.34-.049-6.356-5.024h-.128v.17l3.032 5.25.122 1.08-.17.353-.608.213-.668-.122-4.606-7.511-.14.08-.99 9.178-.729.28-.607-.461.604-6.677-.152-.042-5.34 6.02-.717-.37.067-.662 4.719-6.012-.006-.158h-.055L3.002 18.706l-.487-.456.061-.746.231-.243 1.908-1.312z" /></svg>
);
const CursorMark = () => (
  <svg aria-hidden
    fill="currentColor"
    height={16}
    viewBox="0 0 466.73 532.09"
    width={16}
  >
    <path d="M457.43,125.94L244.42,2.96c-6.84-3.95-15.28-3.95-22.12,0L9.3,125.94c-5.75,3.32-9.3,9.46-9.3,16.11v247.99c0,6.65,3.55,12.79,9.3,16.11l213.01,122.98c6.84,3.95,15.28,3.95,22.12,0l213.01-122.98c5.75-3.32,9.3-9.46,9.3-16.11v-247.99c0-6.65-3.55-12.79-9.3-16.11h-.01ZM444.05,151.99l-205.63,356.16c-1.39,2.4-5.06,1.42-5.06-1.36v-233.21c0-4.66-2.49-8.97-6.53-11.31L24.87,145.67c-2.4-1.39-1.42-5.06,1.36-5.06h411.26c5.84,0,9.49,6.33,6.57,11.39h-.01Z" />
  </svg>
);
const ProviderIcon = ({ provider }: { provider: AIProvider }) => {
  if (provider === 'claude') return <ClaudeCodeMark />;
  if (provider === 'codex') return <SiOpenai aria-hidden
    size={16}
                                   />;
  return <CursorMark />;
};

const PROVIDER_SHORTCUTS = { Digit1: 'claude', Digit2: 'codex', Digit3: 'cursor' } satisfies Record<string, AIProvider>;
const isEditableTarget = (target: EventTarget | null) => target instanceof Element
  && Boolean(target.closest('input, textarea, select, [role="textbox"], [contenteditable]:not([contenteditable="false"])'));

export const ClaudeFooter = ({ onHeightChange }: { onHeightChange?: (height: number) => void }) => {
  const { claudeEnabled, showClaudeUsage } = useAppSettings();
  const isSunset = useIsSunset();
  const state = useAIUsage();
  const { setProvider } = state;
  const onSettings = useLocation().pathname.startsWith('/settings');
  const available = state.accounts.length > 0 || AI_PROVIDERS.some((provider) => state.detection[provider].installed) || Object.keys(state.discoveryErrors).length > 0;
  const visible = (claudeEnabled ?? true) && showClaudeUsage && !onSettings && available;
  const footer = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!visible || !footer.current) {
      onHeightChange?.(0);
      return;
    }
    const element = footer.current;
    const measure = () => onHeightChange?.(element.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible, onHeightChange]);
  useEffect(() => () => onHeightChange?.(0), [onHeightChange]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.repeat || isEditableTarget(event.target)) return;
      const next = PROVIDER_SHORTCUTS[event.code];
      if (!next) return;
      event.preventDefault();
      setProvider(next);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [setProvider, visible]);
  if (!available) return null;
  const provider = state.activeProvider;
  const providerName = AI_PROVIDER_CONFIG[provider].name;
  const accounts = state.accounts.filter((account) => account.provider === provider);
  const account = accounts.find((candidate) => candidate.dir === state.activeDirs[provider]);
  const key = account && aiAccountKey(account);
  const usage = key ? state.usageByAccount[key] : undefined;
  const error = (key && state.errorByAccount[key]) || state.discoveryErrors[provider];
  const cursorSurfaces = provider === 'cursor' ? [...new Set([...(account?.surfaces ?? []), ...(state.detection.cursor.surfaces ?? [])])] : [];
  const grokUnavailable = cursorSurfaces.includes('grok-bot') && !usage?.metrics.some(({ id }) => id === 'grok-weekly');
  const cursorApps = [cursorSurfaces.includes('ide') && 'Cursor IDE', cursorSurfaces.includes('cli') && 'CLI'].filter(Boolean);
  const cursorNote = provider === 'cursor' ? [cursorApps.length ? `Used by ${cursorApps.join(' and ')}` : '', grokUnavailable ? 'Grok Bot installed · usage unavailable' : ''].filter(Boolean).join('. ') : undefined;

  return (
    <footer aria-hidden={!visible}
      aria-label="AI Analytics"
      className={cn(
        'app-region-no-drag fixed bottom-0 left-0 right-0 z-10 flex h-11 select-none items-center gap-3 px-4',
        isSunset ? 'devkitty-footer-glass' : 'border-t border-bp-light-gray-1 bg-bp-light-gray-4 dark:border-bp-dark-gray-2 dark:bg-bp-dark-gray-1',
        'transition-transform duration-300 ease-out motion-reduce:transition-none',
        visible ? 'translate-y-0' : 'pointer-events-none translate-y-full'
      )}
      inert={!visible}
      ref={footer}
    >
      <div aria-label="Usage provider"
        className="flex shrink-0 items-center gap-1"
        role="group"
      >
        {AI_PROVIDERS.map((candidate, index) => (
          <button aria-keyshortcuts={`Meta+${index + 1}`}
            aria-label={`Show ${AI_PROVIDER_CONFIG[candidate].name} usage`}
            aria-pressed={provider === candidate}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
              provider === candidate ? 'bg-black/10 text-bp-dark-gray-1 ring-1 ring-black/10 dark:bg-white/15 dark:text-white dark:ring-white/20' : 'text-bp-gray-1 hover:bg-black/5 dark:text-bp-gray-4 dark:hover:bg-white/10'
            )}
            key={candidate}
            onClick={() => state.setProvider(candidate)}
            title={`${AI_PROVIDER_CONFIG[candidate].name} · ⌘${index + 1}`}
            type="button"
          >
            <ProviderIcon provider={candidate} />
          </button>
        ))}
      </div>

      <AccountPills accounts={accounts}
        activeDir={state.activeDirs[provider]}
        onSelect={(dir) => state.setActive(provider, dir)}
      />

      {usage ? (
        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden"
          data-testid="usage-meter-row"
        >
          {usage.metrics.map((metric, index) => (
            <div className="min-w-0 flex-1 basis-0"
              data-testid="quota-meter-slot"
              key={metric.id}
            >
              <UsageMeter metric={metric}
                note={index === 0 ? cursorNote : undefined}
                now={now}
                provider={provider}
                reportedAt={metric.source === 'admin' ? usage.computedAt : usage.reportedAt}
              />
            </div>
          ))}

          {usage.spend && (
            <div className="shrink-0"
              data-testid="spend-meter-slot"
            >
              <SpendMeter spend={usage.spend} />
            </div>
          )}

          {usage.metrics.length === 0 && !usage.spend && <span className="min-w-0 flex-1 truncate text-xs text-bp-gray-1 dark:text-bp-gray-4">{grokUnavailable ? 'Grok Bot installed · usage unavailable' : 'Usage unavailable.'}</span>}
        </div>
      ) : (
        <span className="min-w-0 flex-1 truncate text-xs text-bp-gray-1 dark:text-bp-gray-4">{key && state.loadingByAccount[key] ? 'Reading usage…' : account ? 'Usage unavailable.' : `No ${providerName} accounts found.`}</span>
      )}

      {error && <span className="max-w-48 shrink truncate text-[11px] text-bp-gray-1 dark:text-bp-gray-4"
        role="status"
        title={`${providerName}: ${error}`}
                >{providerName}: {error}</span>}
    </footer>
  );
};
