import { type IconName } from '@blueprintjs/icons';

export type Group = {
  fullName?: string;
  icon?: IconName;
  id: string;
  name: string;
};

export type Groups = Group[];
