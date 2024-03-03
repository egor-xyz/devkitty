import { FoundEditor } from './foundEditor';
import { FoundShell } from './foundShell';

export type AppSettings = {
  editors: FoundEditor[];
  fetchInterval: number;
  gitHubToken?: string;
  projectActionCollapsed: boolean;
  selectedEditor?: FoundEditor;
  selectedShell?: FoundShell<string>;
  shells: FoundShell<string>[];
  showLogo: boolean;
  soundEffects: boolean;
};
