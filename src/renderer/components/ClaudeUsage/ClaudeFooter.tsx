import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SiOpenai } from 'react-icons/si';
import { useLocation } from 'react-router';
import { AI_PROVIDERS, aiAccountKey, useAIUsage } from 'renderer/hooks/useAIUsage';
import { useAppSettings, useIsSunset } from 'renderer/hooks/useAppSettings';
import { cn } from 'renderer/utils/cn';
import { type AIProvider, type AIUsageWindow } from 'types/aiUsage';

import { AccountPills } from './AccountPills';
import { UsageMeter } from './UsageMeter';

const providerNames: Record<AIProvider, string> = { claude: 'Claude', codex: 'Codex' };
const ClaudeCodeMark = () => (
  <svg aria-hidden
    fill="currentColor"
    fillRule="evenodd"
    height={16}
    viewBox="0 0 24 24"
    width={16}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" />
  </svg>
);
const windowLabel = (window: AIUsageWindow, fallback: string) => {
  if (!window.durationMs) return fallback;
  const hours = window.durationMs / 3600000;
  return hours % 24 === 0 ? `${hours / 24}D` : `${hours}H`;
};

export const ClaudeFooter = ({ onHeightChange }: { onHeightChange?: (height: number) => void }) => {
  const { claudeEnabled, showClaudeUsage } = useAppSettings();
  const isSunset = useIsSunset();
  const state = useAIUsage();
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
  if (!available) return null;
  const provider: AIProvider = state.activeProvider === 'codex' ? 'codex' : 'claude';
  const accounts = state.accounts.filter((account) => account.provider === provider);
  const account = accounts.find((candidate) => candidate.dir === state.activeDirs[provider]);
  const key = account && aiAccountKey(account);
  const usage = key ? state.usageByAccount[key] : undefined;
  const error = (key && state.errorByAccount[key]) || state.discoveryErrors[provider];
  const windows = provider === 'claude' ? (['week', 'fiveHour'] as const) : (['week'] as const);
  return (
    <footer
      aria-hidden={!visible}
      aria-label="AI Analytics"
      className={cn(
        'app-region-no-drag fixed bottom-0 left-0 right-0 z-10 flex h-11 select-none items-center gap-3 px-4',
        isSunset ? 'devkitty-footer-glass' : 'border-t border-bp-light-gray-1 bg-bp-light-gray-4 dark:border-bp-dark-gray-2 dark:bg-bp-dark-gray-1',
        'transition-transform duration-300 ease-out',
        visible ? 'translate-y-0' : 'pointer-events-none translate-y-full'
      )}
      inert={!visible}
      ref={footer}
    >
      <div aria-label="Usage provider"
        className="flex shrink-0 items-center gap-1"
        role="group"
      >
        {AI_PROVIDERS.map((candidate) => (
          <button
            aria-label={`Show ${providerNames[candidate]} usage`}
            aria-pressed={provider === candidate}
            className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
                provider === candidate ? 'bg-black/10 text-bp-dark-gray-1 ring-1 ring-black/10 dark:bg-white/15 dark:text-white dark:ring-white/20' : 'text-bp-gray-1 hover:bg-black/5 dark:text-bp-gray-4 dark:hover:bg-white/10'
              )}
            key={candidate}
            onClick={() => state.setProvider(candidate)}
            title={providerNames[candidate]}
            type="button"
          >
            {candidate === 'claude' ? <ClaudeCodeMark /> : <SiOpenai aria-hidden
              size={16}
                                                           />}
          </button>
          ))}
      </div>

      <AccountPills accounts={accounts}
        activeDir={state.activeDirs[provider]}
        onSelect={(dir) => state.setActive(provider, dir)}
      />

      {usage ? (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {windows.map((name) => {
            const label = windowLabel(usage[name], name === 'week' ? '7D' : '5H');
            return (
              <div className="min-w-0 flex-1"
                key={name}
              >
                <UsageMeter
                  label={label}
                  now={now}
                  provider={provider}
                  reportedAt={usage.reportedAt}
                  title={`${providerNames[provider]} · ${label} usage`}
                  window={usage[name]}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <span className="min-w-0 flex-1 truncate text-xs text-bp-gray-1 dark:text-bp-gray-4">
          {key && state.loadingByAccount[key] ? 'Reading usage…' : account ? 'Usage unavailable.' : `No ${providerNames[provider]} accounts found.`}
        </span>
      )}

      {error && (
        <span className="max-w-48 shrink truncate text-[11px] text-bp-gray-1 dark:text-bp-gray-4"
          role="status"
          title={`${providerNames[provider]}: ${error}`}
        >
          {providerNames[provider]}: {error}
        </span>
      )}

    </footer>
  );
};
