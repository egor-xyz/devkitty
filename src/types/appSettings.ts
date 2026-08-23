import { type FoundEditor } from './foundEditor';
import { type FoundShell } from './foundShell';

export type AppSettings = {
  claudeAccountDir?: string; // config dir of the account shown in the usage footer
  editors: FoundEditor[];
  fetchInterval: number;
  gitHubActions: {
    all: boolean;
    count: number;
    ignoreDependabot: boolean;
    ignoredWorkflows: string[];
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
};
