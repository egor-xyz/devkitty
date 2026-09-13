import { type AIUsage } from 'types/aiUsage';
import { type ClaudeAccount } from 'types/claudeUsage';

import { buildLocalMetric } from '../aiUsage/localMetric';
import { readReportedUsage } from './lastUsage';
import { readEntries } from './transcripts';
import { FIVE_HOURS_MS, SEVEN_DAYS_MS } from './usage';

export const buildUsage = async (account: ClaudeAccount, now: number): Promise<AIUsage> => {
  const reported = readReportedUsage(account.dir);
  const entries = await readEntries(account.dir, now);
  const fiveHour = reported?.fiveHour && reported.fiveHour.resetsAt > now ? reported.fiveHour : undefined;
  const sevenDay = reported?.sevenDay && reported.sevenDay.resetsAt > now ? reported.sevenDay : undefined;

  return {
    account: { ...account, provider: 'claude' },
    computedAt: now,
    metrics: [
      buildLocalMetric({ entries, id: 'five-hour', now, reported: fiveHour, title: '5H', windowMs: FIVE_HOURS_MS }),
      buildLocalMetric({ entries, id: 'seven-day', now, reported: sevenDay, title: '7D', windowMs: SEVEN_DAYS_MS })
    ],
    reportedAt: fiveHour || sevenDay ? reported?.capturedAt : undefined,
  };
};
