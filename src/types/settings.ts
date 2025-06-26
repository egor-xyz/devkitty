import { type nativeTheme, type Rectangle } from 'electron';
import { type Group, type Groups } from 'types/Group';

import { type AppSettings } from './appSettings';
import { type Projects } from './project';

export type Settings = {
  appSettings: AppSettings;
  collapsedGroups: Group['id'][];
  newGroups: Groups;
  projects: Projects;
  themeSource: typeof nativeTheme.themeSource;
  windowBounds: Rectangle;
};
