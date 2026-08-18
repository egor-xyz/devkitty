import { type FoundEditor } from './foundEditor';
import { type FoundShell } from './foundShell';

export type AppSettings = {
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
  showLogo: boolean;
  showWorktrees: boolean;
};
