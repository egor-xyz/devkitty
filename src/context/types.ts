import { Intent } from '@blueprintjs/core/src/common/intent';

import { Group, Groups, Project, Projects, ProjectSettings, ProjectsSettings, ProjectWithError } from 'models';

export type Reducer<S, A> = (prevState: S, action: A) => S;

export interface Log {
  date: number;
  intent: Intent;
  text: string;
}

interface MergeFavorites {
  [name: string]: string | undefined;
}

export interface AppStoreState {
  IDE?: string;
  appStatus?: string;
  appUpdated?: string;
  autoFetch: boolean;
  autoFetchInterval: number;
  bottomBar: boolean;
  collapsedGroups: Set<string>;
  darkMode: boolean;
  darkModeOS: boolean;
  groupFilter: boolean;
  groupId?: string;
  groups: Groups;
  loading: {
    [name: string]: boolean;
  },
  logIntent: Intent;
  logs: Log[];
  mergeFavorites: MergeFavorites;
  online: boolean;
  projectInfo: boolean;
  projects: Projects;
  projectsSettings: ProjectsSettings;
  projectsSrc: string[];
  projectsWithError: ProjectWithError[];
  shell?: string;
  showAbout: boolean;
  showLog?: boolean;
  showLogo: boolean;
}

export type AppStoreActions =
  | { payload: string[], type: 'addProjectsSrc' }
  | { payload: string, type: 'removeProjectsSrc' }
  | { payload?: string, type: 'setAppStatus' }
  | { payload?: string, type: 'setAppUpdated' }
  | { payload: number, type: 'setAutoFetchInterval' }
  | { payload: boolean, type: 'setDarkMode' }
  | {
    payload: {
      darkMode: boolean,
      darkModeOS: boolean
    }, type: 'setDarkModeOS'
  }
  | { payload: boolean, type: 'setOnline' }
  | { payload: string, type: 'setIDE' }
  | { payload: string, type: 'setShell' }
  | { payload: Groups, type: 'setGroups' }
  | { payload: Group, type: 'addGroup' }
  | { payload: string, type: 'setGroupId' }
  | {
    payload: {
      active?: boolean,
      name: string
    },
    type: 'setLoading'
  }
  | { type: 'toggleLog' }
  | {
    payload: {
      log: Log,
      logIntent?: Intent;
    }, type: 'log'
  }
  | { type: 'clearLog' }
  | { payload: Intent, type: 'setLogIntent' }
  | { payload: MergeFavorites, type: 'setMergeFavorites' }
  | { payload: Project, type: 'setProject' }
  | { payload: ProjectSettings, type: 'setProjectSettings' }
  | { payload: ProjectsSettings, type: 'setProjectsSettings' }
  | { payload: Projects, type: 'setProjects' }
  | { payload: keyof AppStoreState, type: 'toggle' }
  | { type: 'toggleAbout' }
  | { payload: boolean, type: 'setGroupFilter' }
  | { payload: string, type: 'toggleCollapsedGroup' }
  | { payload: ProjectWithError[], type: 'setProjectsWithError' }
  ;