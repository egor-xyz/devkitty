import { Icon, Popover } from '@blueprintjs/core';
import { useEffect, useRef, useState } from 'react';
import { type AIProvider, type AIUsageMetric, type AIUsageSpend } from 'types/aiUsage';

import { formatCountdown, formatTokens, meterColor, modelLabel } from './format';

type Props = {
  metric: AIUsageMetric;
  note?: string;
  now: number;
  provider: AIProvider;
  reportedAt?: number;
};

const PROVIDER_NAMES: Record<AIProvider, string> = {
  claude: 'Claude',
  codex: 'Codex',
  cursor: 'Cursor'
};
const SCOPE_NAMES: Record<AIUsageMetric['scope'], string> = {
  account: 'Account',
  organization: 'Org',
  project: 'Project',
  workspace: 'Workspace'
};
const SOURCE_NAMES: Record<AIUsageMetric['source'], string> = {
  admin: 'Admin API',
  local: 'Local files',
  provider: 'Provider report'
};
const COMPACT_LABELS: Record<AIUsageMetric['id'], string> = {
  'cursor-models': 'Cursor',
  'five-hour': '5H',
  'grok-weekly': 'Grok',
  month: 'Month',
  'other-models': 'Other',
  'seven-day': '7D'
};

const scopeLabel = (scope: AIUsageMetric['scope']) => SCOPE_NAMES[scope];
const clockTime = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const metricPercent = (metric: AIUsageMetric) => metric.percent === undefined ? undefined : Math.round(metric.percent * 100);
const localHistoryLabel = (metric: AIUsageMetric) => {
  if (metric.source === 'admin') return 'Provider report for this calendar month';
  if (metric.tokensPeriod === 'provider-period') return 'Local tokens in this quota period';
  if (metric.id === 'five-hour') return 'Local token history for the last 5 hours';
  if (metric.id === 'seven-day') return 'Local token history for the last 7 days';
  return 'Token history';
};
const compactLabel = (metric: AIUsageMetric) => COMPACT_LABELS[metric.id];

const useAnimatedPercentage = (target: number) => {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      valueRef.current = target;
      setValue(target);
      return;
    }
    const from = valueRef.current;
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = Math.min(1, (now - startedAt) / 900);
      const next = from + (target - from) * (1 - (1 - elapsed) ** 3);
      valueRef.current = next;
      setValue(next);
      if (elapsed < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [target]);
  return value;
};

const Detail = ({ metric, note, now, provider, reportedAt }: Props) => {
  const pct = metricPercent(metric);
  const color = meterColor(metric.percent ?? 0);
  const models = [...(metric.models ?? [])].sort((a, b) => b.tokens - a.tokens || a.model.localeCompare(b.model));
  const total = models.reduce((sum, item) => sum + item.tokens, 0);
  return (
    <div className="max-h-[min(420px,70vh)] w-[284px] overflow-y-auto p-4 text-bp-dark-gray-1 dark:text-bp-light-gray-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{PROVIDER_NAMES[provider]} · {metric.title}</div>
          <div className="mt-0.5 text-[11px] text-bp-gray-2">{scopeLabel(metric.scope)} · {SOURCE_NAMES[metric.source]}</div>
        </div>

        <span className="text-xl font-bold tabular-nums leading-none"
          style={{ color }}
        >{pct === undefined ? '—' : `${pct}%`}</span>
      </div>

      {pct === undefined ? (
        <div className="mt-3 rounded bg-black/5 px-2 py-1.5 text-xs dark:bg-white/5">Quota unavailable</div>
      ) : (
        <>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-bp-light-gray-2 dark:bg-bp-dark-gray-4">
            <div className="h-full rounded-full"
              style={{ backgroundColor: color, width: `${Math.max(pct, 2)}%` }}
            />
          </div>

          <div className="mt-2 text-xs tabular-nums text-bp-gray-1 dark:text-bp-gray-4">
            Current quota period{metric.resetsAt ? ` · resets ${clockTime(metric.resetsAt)} · in ${formatCountdown(metric.resetsAt - now)}` : ''}
          </div>
        </>
      )}

      {metric.tokens !== undefined && (
        <div className="mt-3.5 border-t border-bp-light-gray-2 pt-3 dark:border-bp-dark-gray-3">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="text-bp-gray-1 dark:text-bp-gray-4">{localHistoryLabel(metric)}</span>
            <span className="shrink-0 font-semibold tabular-nums">{formatTokens(metric.tokens)}</span>
          </div>

          {metric.source !== 'admin' && (
            <div className="mt-2 text-[11px] leading-snug text-bp-gray-2">
              Local log tokens can miss use on other machines. They are not billed spend and do not match the quota percent.
            </div>
          )}

          {models.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5">
              {models.map((item) => (
                <div className="flex items-baseline justify-between gap-3 text-xs"
                  key={item.model}
                >
                  <span className="truncate font-medium">{modelLabel(item.model)}</span>
                  <span className="shrink-0 tabular-nums text-bp-gray-1 dark:text-bp-gray-4">{formatTokens(item.tokens)} <span className="text-bp-gray-3">{total ? Math.round(item.tokens / total * 100) : 0}%</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {note && <div className="mt-3 text-[11px] text-bp-gray-2">{note}</div>}

      <div className="mt-3 border-t border-bp-light-gray-2 pt-2.5 text-[11px] text-bp-gray-2 dark:border-bp-dark-gray-3">
        {reportedAt ? `Captured ${formatCountdown(Math.max(0, now - reportedAt))} ago` : 'Capture time unavailable'}
      </div>
    </div>
  );
};

export const UsageMeter = (props: Props) => {
  const { metric, note, now, provider, reportedAt } = props;
  const pct = metricPercent(metric);
  const animatedPct = useAnimatedPercentage(pct ?? 0);
  const color = meterColor(metric.percent ?? 0);
  const tokens = metric.tokens === undefined ? '' : `, ${formatTokens(metric.tokens)} tokens`;
  return (
    <Popover content={(
      <Detail metric={metric}
        note={note}
        now={now}
        provider={provider}
        reportedAt={reportedAt}
      />
    )}
      fill
      interactionKind="hover"
      minimal
      placement="top"
    >
      <button
        aria-label={`${metric.title}: ${pct === undefined ? `quota unavailable${tokens}` : `${pct}% of current quota period`}`}
        className="flex w-full min-w-0 items-center gap-2 rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        type="button"
      >
        <span className="shrink-0 rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bp-gray-1 dark:bg-white/10 dark:text-white/85">{compactLabel(metric)}</span>

        {pct === undefined ? (
          <span className="min-w-0 flex-1 truncate text-[11px] text-bp-gray-1 dark:text-bp-gray-4">Quota unavailable{metric.tokens === undefined ? '' : ` · ${formatTokens(metric.tokens)}`}</span>
        ) : (
          <>
            <div className="h-2 min-w-2 flex-1 overflow-hidden rounded-full bg-bp-light-gray-2 dark:bg-bp-dark-gray-4">
              <div className="h-full rounded-full"
                style={{ backgroundColor: color, width: `${Math.max(animatedPct, 2)}%` }}
              />
            </div>

            <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums"
              style={{ color }}
            >{Math.round(animatedPct)}%</span>

            {metric.resetsAt && <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-bp-gray-1 dark:text-bp-gray-4"><Icon className="opacity-60"
              icon="time"
              size={11}
                                                                                                                                           />{formatCountdown(metric.resetsAt - now)}</span>}
          </>
        )}
      </button>
    </Popover>
  );
};

const money = (micros: number) => new Intl.NumberFormat(undefined, { currency: 'USD', style: 'currency' }).format(micros / 1_000_000);

export const SpendMeter = ({ spend }: { spend: AIUsageSpend }) => {
  const percent = spend.limitUsdMicros && spend.limitUsdMicros > 0 ? Math.min(1, spend.amountUsdMicros / spend.limitUsdMicros) : undefined;
  const text = `${money(spend.amountUsdMicros)}${spend.limitUsdMicros ? ` of ${money(spend.limitUsdMicros)}` : ''}`;
  const period = spend.period === 'calendar-month' ? 'Current calendar month' : 'Current billing cycle';
  return (
    <Popover content={(
      <div className="w-[260px] p-4 text-sm">
        <div className="font-semibold">{spend.label}</div>
        <div className="mt-1 text-xs text-bp-gray-2">{scopeLabel(spend.scope)} · {period}</div>
        <div className="mt-3 text-lg font-bold tabular-nums">{text}</div>

        {percent !== undefined && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-bp-light-gray-2 dark:bg-bp-dark-gray-4">
            <div className="h-full rounded-full bg-green-500"
              style={{ width: `${Math.max(2, percent * 100)}%` }}
            />
          </div>
        )}

        {spend.qualifier && <div className="mt-2 text-xs text-bp-gray-2">{spend.qualifier}</div>}
      </div>
    )}
      interactionKind="hover"
      minimal
      placement="top"
    >
      <button aria-label={`${spend.label}: ${text}`}
        className="inline-flex w-auto shrink-0 items-center gap-2 rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        type="button"
      >
        <span className="shrink-0 rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bp-gray-1 dark:bg-white/10 dark:text-white/85">USD</span>
        <span className="shrink-0 text-xs tabular-nums">{text}</span>
      </button>
    </Popover>
  );
};
