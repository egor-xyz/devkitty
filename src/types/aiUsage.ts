export type AIAccount = {
  dir: string;
  email?: string;
  label: string;
  org?: string;
  plan?: string;
  provider: AIProvider;
  surfaces?: CursorSurface[];
};
export type AIDetection = {
  installed: boolean;
  surfaces?: CursorSurface[];
  version?: string;
};
export type AIProvider = 'claude' | 'codex' | 'cursor';

export type AIProviderFilter = 'both' | AIProvider;

export type AIUsage = {
  account: AIAccount;
  computedAt: number;
  metrics: AIUsageMetric[];
  reportedAt?: number;
  spend?: AIUsageSpend;
};

export type AIUsageMetric = {
  id: 'cursor-models' | 'five-hour' | 'grok-weekly' | 'month' | 'other-models' | 'seven-day';
  label: string;
  models?: { model: string; tokens: number }[];
  percent?: number;
  resetsAt?: number;
  scope: 'account' | 'organization' | 'project' | 'workspace';
  source: 'admin' | 'local' | 'provider';
  title: string;
  tokens?: number;
  tokensPeriod?: 'provider-period' | 'trailing-window';
};

export type AIUsageSpend = {
  amountUsdMicros: number;
  label: 'On-demand' | 'Org API spend' | 'Project API spend' | 'Workspace API spend';
  limitUsdMicros?: number;
  period: 'billing-cycle' | 'calendar-month';
  qualifier?: string;
  scope: 'account' | 'organization' | 'project' | 'workspace';
  source: 'admin' | 'provider';
  startsAt?: number;
};

export type CursorSurface = 'cli' | 'grok-bot' | 'ide';
