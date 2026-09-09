import { type ClaudeAccount, type ClaudeDetection, type ClaudeUsageWindow } from './claudeUsage';

export type AIAccount = ClaudeAccount & { provider: AIProvider };
export type AIDetection = ClaudeDetection;
export type AIProvider = 'claude' | 'codex';
export type AIProviderFilter = 'both' | AIProvider;
export type AIUsage = {
  account: AIAccount;
  computedAt: number;
  fiveHour: AIUsageWindow;
  reportedAt?: number;
  week: AIUsageWindow;
};
export type AIUsageWindow = ClaudeUsageWindow & { durationMs?: number };
