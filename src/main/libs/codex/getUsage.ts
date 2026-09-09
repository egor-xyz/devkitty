import { type AIAccount, type AIUsage, type AIUsageWindow } from 'types/aiUsage';

import { FIVE_HOURS_MS, modelBreakdown, SEVEN_DAYS_MS, tokensInWindow, type UsageEntry } from '../claude/usage';
import { readTranscripts, type ReportedWindow } from './transcripts';

const buildWindow = (entries: UsageEntry[], now: number, durationMs: number, reported?: ReportedWindow): AIUsageWindow => {
  const tokens = tokensInWindow(entries, now, durationMs);
  return {
    active: Boolean(reported) || tokens > 0,
    cap: 0,
    durationMs,
    models: modelBreakdown(entries, now - durationMs, now),
    pct: reported?.pct ?? 0,
    reported: Boolean(reported),
    resetsAt: reported?.resetsAt ?? 0,
    startsAt: reported ? reported.resetsAt - durationMs : now - durationMs,
    tokens
  };
};

export const buildUsage = async (account: AIAccount, now: number): Promise<AIUsage> => {
  const { entries, reported } = await readTranscripts(account.dir, now);
  return {
    account,
    computedAt: now,
    fiveHour: buildWindow(entries, now, FIVE_HOURS_MS, reported?.fiveHour),
    reportedAt: reported?.capturedAt,
    week: buildWindow(entries, now, SEVEN_DAYS_MS, reported?.week)
  };
};
