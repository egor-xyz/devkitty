import { type AIAccount, type AIUsage } from 'types/aiUsage';

import { buildLocalMetric } from '../aiUsage/localMetric';
import { SEVEN_DAYS_MS } from '../claude/usage';
import { readTranscripts } from './transcripts';

export const buildUsage = async (account: AIAccount, now: number): Promise<AIUsage> => {
  const { entries, reported } = await readTranscripts(account.dir, now);
  return {
    account,
    computedAt: now,
    metrics: [
      buildLocalMetric({ entries, id: 'seven-day', now, reported: reported?.week, title: '7D', windowMs: SEVEN_DAYS_MS })
    ],
    reportedAt: reported?.week?.capturedAt,
  };
};
