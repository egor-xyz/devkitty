import { Icon, Popover } from '@blueprintjs/core';
import { useEffect, useRef, useState } from 'react';
import { type AIProvider, type AIUsageWindow } from 'types/aiUsage';

import { formatCountdown, formatTokens, meterColor, modelLabel } from './format';

const ResetCountdown = ({ ms }: { ms: number }) => <span>{formatCountdown(ms)}</span>;

type Props = {
  label: string; // e.g. "7D"
  now: number;
  provider: AIProvider;
  reportedAt?: number;
  title: string; // e.g. "Last 7 days"
  window: AIUsageWindow;
};

const clockTime = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

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
      const eased = 1 - (1 - elapsed) ** 3;
      const next = from + (target - from) * eased;
      valueRef.current = next;
      setValue(next);
      if (elapsed < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [target]);

  return value;
};

const Detail = ({ now, provider, reportedAt, title, window }: Omit<Props, 'label'>) => {
  const known = window.reported || window.cap > 0;
  const pct = Math.round(window.pct * 100);
  const color = meterColor(window.pct);
  const localModels = [...window.models].sort((a, b) => b.tokens - a.tokens || a.model.localeCompare(b.model));
  const modelTotal = localModels.reduce((sum, m) => sum + m.tokens, 0);
  const reportedCodex = provider === 'codex' && window.reported;

  return (
    <div className="w-[268px] p-4 text-bp-dark-gray-1 dark:text-bp-light-gray-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{title}</span>

        <span
          className="text-xl font-bold tabular-nums leading-none"
          style={{ color }}
        >
          {known ? `${pct}%` : '—'}
        </span>
      </div>

      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-bp-light-gray-2 dark:bg-bp-dark-gray-4">
        {window.active && known && (
          <div
            className="h-full rounded-full"
            style={{ backgroundColor: color, width: `${Math.max(pct, 2)}%` }}
          />
        )}
      </div>

      <div className="mt-2 text-xs tabular-nums text-bp-gray-1 dark:text-bp-gray-4">
        {!known ? `${formatTokens(window.tokens)} tokens · quota unavailable` : window.active
          ? `Resets ${clockTime(window.resetsAt)} · in ${formatCountdown(window.resetsAt - now)}`
          : 'Idle — no activity in this window'}
      </div>

      {localModels.length > 0 && (
        <div className="mt-3.5 border-t border-bp-light-gray-2 pt-3 dark:border-bp-dark-gray-3">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-bp-gray-2">
              {reportedCodex ? 'Local by model' : 'By model'}
            </span>

            <span className="text-[11px] tabular-nums text-bp-gray-2">
              ran {formatTokens(window.tokens)}{reportedCodex ? ' locally' : ''}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {localModels.map((m) => (
              <div
                className="flex items-baseline justify-between gap-3 text-xs"
                key={m.model}
              >
                <span className="truncate font-medium">{modelLabel(m.model)}</span>

                <span className="shrink-0 tabular-nums text-bp-gray-1 dark:text-bp-gray-4">
                  {formatTokens(m.tokens)}

                  <span className="ml-1.5 text-bp-gray-3 dark:text-bp-gray-3">
                    {modelTotal ? Math.round((m.tokens / modelTotal) * 100) : 0}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {reportedCodex && (
        <div className="mt-3 text-[11px] leading-snug text-bp-gray-2">
          Quota can include use not recorded in local sessions.
        </div>
      )}

      <div className="mt-3.5 border-t border-bp-light-gray-2 pt-2.5 text-[11px] leading-snug text-bp-gray-2 dark:border-bp-dark-gray-3">
        {window.reported
          ? `Reported by ${provider === 'claude' ? 'Claude Code' : 'Codex'}${reportedAt ? ` · captured ${formatCountdown(Math.max(0, now - reportedAt))} ago` : ' · capture time unknown'}`
          : provider === 'codex' ? 'Local session tokens on this machine. Quota unavailable until Codex records a rate-limit snapshot.' : 'Approximate — local sessions on this machine, vs your 28-day peak.'}
      </div>
    </div>
  );
};

export const UsageMeter = ({ label, now, provider, reportedAt, title, window }: Props) => {
  const known = window.reported || window.cap > 0;
  const pct = Math.round(window.pct * 100);
  const animatedPct = useAnimatedPercentage(pct);

  return (
    <Popover
      content={
        <Detail
          now={now}
          provider={provider}
          reportedAt={reportedAt}
          title={title}
          window={window}
        />
      }
      fill
      interactionKind="hover"
      minimal
      placement="top"
    >
      <button aria-label={`${title}: ${known ? `${pct}%` : `${formatTokens(window.tokens)} tokens, quota unavailable`}`}
        className="flex w-full min-w-0 items-center gap-2 rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        type="button"
      >
        <span className="shrink-0 rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bp-gray-1 dark:bg-white/10 dark:text-white/85">
          {label}
        </span>

        <div className="h-2 min-w-2 flex-1 overflow-hidden rounded-full bg-bp-light-gray-2 dark:bg-bp-dark-gray-4">
          {window.active && known && (
            <div
              className="h-full rounded-full"
              style={{
                backgroundColor: meterColor(window.pct),
                width: `${Math.max(animatedPct, 2)}%`
              }}
            />
          )}
        </div>

        {!known ? (
          <span className="shrink-0 text-[11px] tabular-nums text-bp-gray-1 dark:text-bp-gray-4">— · {formatTokens(window.tokens)} tokens</span>
        ) : window.active ? (
          <>
            <span
              className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-bp-dark-gray-1 dark:text-bp-light-gray-5"
              style={{ color: meterColor(window.pct) }}
            >
              {Math.round(animatedPct)}%
            </span>

            <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-bp-gray-1 dark:text-bp-gray-4">
              <Icon
                className="opacity-60"
                icon="time"
                size={11}
              />

              <ResetCountdown ms={window.resetsAt - now} />
            </span>
          </>
        ) : (
          <span className="w-10 shrink-0 text-right text-xs italic text-bp-gray-2 dark:text-bp-gray-3">idle</span>
        )}
      </button>
    </Popover>
  );
};
