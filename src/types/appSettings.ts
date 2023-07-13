import { FoundEditor } from './foundEditor';
import { FoundShell } from './foundShell';

export type AppSettings = {
  auth:
    | {
        type: 'device';
        
      }
    | {
        saved: boolean;
        type: 'PAT';
      };
  editors: FoundEditor[];
  fetchInterval: number;
  projectActionCollapsed: boolean;
  selectedEditor?: FoundEditor;
  selectedShell?: FoundShell<string>;
  shells: FoundShell<string>[];
  showLogo: boolean;
  soundEffects: boolean;
};
