import { FoundEditor } from './foundEditor';
import { FoundShell } from './foundShell';

export type AppSettings = {
  editors: FoundEditor[];
  fetchInterval: number;
  gitHubActions: {
    all: boolean;
    count: number;
    inProgress: boolean;
  };
  gitHubToken?: string;
  selectedEditor?: FoundEditor;
  selectedShell?: FoundShell<string>;
  shells: FoundShell<string>[];
  showLogo: boolean;
};
