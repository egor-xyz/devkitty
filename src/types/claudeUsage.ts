export type ClaudeAccount = {
  dir: string; // absolute path to the config dir, e.g. /Users/x/.claude
  email?: string; // account email if discoverable
  label: string; // short label, e.g. 'claude', 'claude-b'
  org?: string; // organization / display name, e.g. 'TegoAI'
  plan?: string; // readable plan, e.g. 'Max 5×'
};

export type ClaudeDetection = {
  installed: boolean;
  version?: string;
};

export type ClaudeModelUsage = {
  model: string;
  tokens: number;
};

export type ClaudeUsage = {
  account: ClaudeAccount;
  computedAt: number; // epoch ms
  fiveHour: ClaudeUsageWindow;
  reportedAt?: number; // epoch ms the server figures were captured, if reported
  week: ClaudeUsageWindow;
};

export type ClaudeUsageWindow = {
  active: boolean;
  cap: number; // estimated ceiling (only meaningful when reported === false)
  models: ClaudeModelUsage[]; // per-model breakdown within this window
  pct: number; // 0..1
  reported: boolean; // true = real server % from Claude Code; false = local estimate
  resetsAt: number; // epoch ms
  startsAt: number; // epoch ms
  tokens: number; // tokens run in the trailing window (local)
};
