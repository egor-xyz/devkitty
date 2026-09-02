import { type FoundEditor } from './foundEditor';
import { type FoundShell } from './foundShell';
import { type IgnoredWorkflow } from './ignoredWorkflow';

export type AppSettings = {
  claudeAccountDir?: string; // config dir of the account shown in the usage footer
  claudeEnabled: boolean; // master switch for the Claude Code usage integration
  clipboardDownscale: boolean; // header toggle: auto-shrink clipboard images > 1200px for Claude Code
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
  selectedEditor?: FoundEditor;
  selectedShell?: FoundShell<string>;
  shells: FoundShell<string>[];
  showClaudeUsage: boolean; // whether the Claude Code usage footer is shown
  showLogo: boolean;
  showWorktrees: boolean;
  theme: 'default' | 'sunset'; // 'sunset' = new gradient/glass look, 'default' = previous solid look
};
