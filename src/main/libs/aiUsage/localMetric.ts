import { type AIUsageMetric } from 'types/aiUsage';

import { modelBreakdown, type UsageEntry } from '../claude/usage';

type LocalMetricOptions = {
  entries: UsageEntry[];
  id: 'five-hour' | 'seven-day';
  now: number;
  reported?: ReportedWindow;
  title: string;
  windowMs: number;
};

type ReportedWindow = { pct: number; resetsAt: number };

export const buildLocalMetric = ({ entries, id, now, reported, title, windowMs }: LocalMetricOptions): AIUsageMetric => {
  const startsAt = reported ? reported.resetsAt - windowMs : now - windowMs;
  const models = modelBreakdown(entries, startsAt, now);

  return {
    id,
    label: reported ? `${title} usage` : `${title} · Quota unavailable`,
    models,
    ...(reported ? { percent: reported.pct, resetsAt: reported.resetsAt } : {}),
    scope: 'account',
    source: reported ? 'provider' : 'local',
    title,
    tokens: models.reduce((total, model) => total + model.tokens, 0),
    tokensPeriod: reported ? 'provider-period' : 'trailing-window'
  };
};
