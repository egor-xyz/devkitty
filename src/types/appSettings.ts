import { type AIProviderFilter } from './aiUsage';
import { type FoundEditor } from './foundEditor';
import { type FoundShell } from './foundShell';
import { type IgnoredWorkflow } from './ignoredWorkflow';

export type AppSettings = {
  aiProvider?: AIProviderFilter;
  anthropicUsageWorkspaceId?: string;
  autoUpdate: boolean; // download updates in the background; restarting always needs a click
  claudeAccountDir?: string; // config dir of the account shown in the usage footer
  claudeEnabled: boolean; // legacy storage key: master switch for AI analytics
  clipboardDownscale: boolean; // header toggle: auto-shrink clipboard images > 1200px for Claude Code
  codexAccountDir?: string; // Codex profile shown in AI analytics
  cursorAccountDir?: string; // Cursor account shown in AI analytics
  editors: FoundEditor[];
  fetchInterval: number;
  gitHubActions: {
    all: boolean;
    count: number;
    ignoreDependabot: boolean;
    ignoredWorkflows: IgnoredWorkflow[];
    notifications: boolean;
    pinnedWorkflows: string[];
  };
  gitHubPulls: {
    pollInterval: number;
  };
  gitHubToken?: string;
  openAIUsageProjectId?: string;
  selectedEditor?: FoundEditor;
  selectedShell?: FoundShell<string>;
  shells: FoundShell<string>[];
  showClaudeUsage: boolean; // legacy storage key: whether the AI analytics footer is shown
  showLogo: boolean;
  showWorktrees: boolean;
  telemetry: boolean;
  theme: 'default' | 'sunset'; // 'sunset' = new gradient/glass look, 'default' = previous solid look
};
