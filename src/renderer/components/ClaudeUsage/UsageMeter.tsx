import { Icon, Popover } from '@blueprintjs/core';
import NumberFlow from '@number-flow/react';
import { type ClaudeUsageWindow } from 'types/claudeUsage';

import { countdownParts, formatCountdown, formatTokens, meterColor, modelLabel } from './format';

// Slow, smooth number animation shared by the % and the reset countdown.
const NUMBER_FLOW_TIMING = {
  spinTiming: { duration: 900, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  transformTiming: { duration: 900, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }
} as const;

const AnimatedCountdown = ({ ms }: { ms: number }) => {
  const parts = countdownParts(ms);
  if (parts === null) return <span>now</span>;
  if (parts.length === 0) return <span>&lt;1m</span>;

  return (
    <span className="flex items-baseline gap-1">
      {parts.map((p) => (
        <NumberFlow
          key={p.unit}
          spinTiming={NUMBER_FLOW_TIMING.spinTiming}
          suffix={p.unit}
          transformTiming={NUMBER_FLOW_TIMING.transformTiming}
          value={p.value}
        />
      ))}
    </span>
  );
};

type Props = {
  label: string; // e.g. "7D"
  now: number;
  reportedAt?: number;
  title: string; // e.g. "Last 7 days"
  window: ClaudeUsageWindow;
};

const clockTime = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const Detail = ({ now, reportedAt, title, window }: Omit<Props, 'label'>) => {
  const pct = Math.round(window.pct * 100);
  const color = meterColor(window.pct);
  const modelTotal = window.models.reduce((sum, m) => sum + m.tokens, 0);

  return (
    <div className="w-[268px] p-4 text-bp-dark-gray-1 dark:text-bp-light-gray-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{title}</span>

        <span
          className="text-xl font-bold tabular-nums leading-none"
          style={{ color }}
        >
          {pct}%
        </span>
      </div>

      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-bp-light-gray-2 dark:bg-bp-dark-gray-4">
        {window.active && (
          <div
            className="h-full rounded-full"
            style={{ backgroundColor: color, width: `${Math.max(pct, 2)}%` }}
          />
        )}
      </div>

      <div className="mt-2 text-xs tabular-nums text-bp-gray-1 dark:text-bp-gray-4">
        {window.active
          ? `Resets ${clockTime(window.resetsAt)} · in ${formatCountdown(window.resetsAt - now)}`
          : 'Idle — no activity in this window'}
      </div>

      {window.models.length > 0 && (
        <div className="mt-3.5 border-t border-bp-light-gray-2 pt-3 dark:border-bp-dark-gray-3">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-bp-gray-2">By model</span>
            <span className="text-[11px] tabular-nums text-bp-gray-2">ran {formatTokens(window.tokens)}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            {window.models.map((m) => (
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

      <div className="mt-3.5 border-t border-bp-light-gray-2 pt-2.5 text-[11px] leading-snug text-bp-gray-2 dark:border-bp-dark-gray-3">
        {window.reported
          ? `Live from Claude Code${reportedAt ? ` · updated ${formatCountdown(now - reportedAt)} ago` : ''}`
          : 'Approximate — local sessions on this machine, vs your 28-day peak. Run Claude Code once here to show the real limit.'}
      </div>
    </div>
  );
};

export const UsageMeter = ({ label, now, reportedAt, title, window }: Props) => {
  const pct = Math.round(window.pct * 100);

  return (
    <Popover
      content={
        <Detail
          now={now}
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
      <div className="flex w-full cursor-default items-center gap-3">
        <span className="shrink-0 rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bp-gray-1 dark:bg-white/10 dark:text-white/85">
          {label}
        </span>

        <div className="h-2 flex-1 overflow-hidden rounded-full bg-bp-light-gray-2 dark:bg-bp-dark-gray-4">
          {window.active && (
            <div
              className="h-full rounded-full transition-[width,background-color] duration-1000 ease-out"
              style={{ backgroundColor: meterColor(window.pct), width: `${Math.max(pct, 2)}%` }}
            />
          )}
        </div>

        {window.active ? (
          <>
            <NumberFlow
              className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-bp-dark-gray-1 dark:text-bp-light-gray-5"
              spinTiming={NUMBER_FLOW_TIMING.spinTiming}
              suffix="%"
              transformTiming={NUMBER_FLOW_TIMING.transformTiming}
              value={pct}
            />

            <span className="flex w-[68px] shrink-0 items-center justify-end gap-1 text-xs tabular-nums text-bp-gray-1 dark:text-bp-gray-4">
              <Icon
                className="opacity-60"
                icon="time"
                size={11}
              />

              <AnimatedCountdown ms={window.resetsAt - now} />
            </span>
          </>
        ) : (
          <span className="w-[122px] shrink-0 text-right text-xs italic text-bp-gray-2 dark:text-bp-gray-3">idle</span>
        )}
      </div>
    </Popover>
  );
};
