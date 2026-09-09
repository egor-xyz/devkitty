import { type IconName } from '@blueprintjs/icons';

export type CommandItem = {
  active?: boolean;
  closeOnPerform?: boolean; // default true; toggles pass false to stay open
  icon?: IconName;
  id: string;
  keywords?: string; // extra search text
  perform: () => void;
  section: 'Appearance' | 'GitHub' | 'Integrations' | 'Navigation' | 'Projects' | 'Worktrees';
  subtitle?: string; // current value / file path
  title: string;
};
