import { type ClaudeAccount, type ClaudeUsage, type ClaudeUsageWindow } from 'types/claudeUsage';

import { readReportedUsage, type ReportedWindow } from './lastUsage';
import { readEntries } from './transcripts';
import { computeFiveHour, computeWeek, FIVE_HOURS_MS, modelBreakdown, SEVEN_DAYS_MS, tokensInWindow, type UsageEntry } from './usage';

// Prefer the real server-reported %/reset; keep the local estimate's cap/start
// as fallback. Tokens and models are always the local trailing-window figures —
// they describe what you actually ran, alongside whichever % we trust.
const mergeWindow = (
  reported: ReportedWindow | undefined,
  estimate: ClaudeUsageWindow,
  entries: UsageEntry[],
  now: number,
  windowMs: number
): ClaudeUsageWindow => ({
  active: reported ? true : estimate.active,
  cap: estimate.cap,
  models: modelBreakdown(entries, now - windowMs, now),
  pct: reported ? reported.pct : estimate.pct,
  reported: Boolean(reported),
  resetsAt: reported ? reported.resetsAt : estimate.resetsAt,
  startsAt: estimate.startsAt,
  tokens: tokensInWindow(entries, now, windowMs)
});

export const buildUsage = async (account: ClaudeAccount, now: number): Promise<ClaudeUsage> => {
  const reported = readReportedUsage(account.dir);
  const entries = await readEntries(account.dir, now);

  return {
    account,
    computedAt: now,
    fiveHour: mergeWindow(reported?.fiveHour, computeFiveHour(entries, now), entries, now, FIVE_HOURS_MS),
    reportedAt: reported?.capturedAt,
    week: mergeWindow(reported?.sevenDay, computeWeek(entries, now), entries, now, SEVEN_DAYS_MS)
  };
};
