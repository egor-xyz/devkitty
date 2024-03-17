import { Rectangle, nativeTheme } from 'electron';

import { Group, Groups } from 'types/Group';

import { AppSettings } from './appSettings';
import { Projects } from './project';

export type Settings = {
  appSettings: AppSettings;
  collapsedGroups: Group['id'][];
  newGroups: Groups;
  projects: Projects;
  themeSource: typeof nativeTheme.themeSource;
  windowBounds: Rectangle;
};
