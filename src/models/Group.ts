import { IconName } from '@blueprintjs/core';

export interface Group {
  icon?: IconName,
  id: string,
  name: string,
}

export type Groups = Group[];

export const defGroups: Groups = [
  {
    icon: 'book',
    id: '0',
    name: 'All'
  }
];

export const defGroupsIds = defGroups.map(g => g.id);
export const defGroupsNames = defGroups.map(g => g.name.toLowerCase());