import { findIndex } from 'lodash';

import { AppStoreActions, AppStoreState, Reducer, successLogAction } from 'context';
import { setAppStoreSettings } from 'utils';
import { defGroups, defGroupsIds } from 'models';

export const reducer: Reducer<AppStoreState, AppStoreActions> = (state, action) => {
  switch (action.type) {
    case 'setProjectsWithError': {
      return {
        ...state,
        projectsWithError: [...action.payload]
      };
    }
    case 'setIDE': {
      const val: Partial<AppStoreState> = {
        IDE: action.payload.length ? action.payload : undefined,
      };
      setAppStoreSettings(val);
      return {
        ...state,
        ...val,
      };
    }
    case 'setShell': {
      const val: Partial<AppStoreState> = {
        shell: action.payload.length ? action.payload : undefined,
      };
      setAppStoreSettings(val);
      return {
        ...state,
        ...val,
      };
    }
    case 'log': {
      return {
        ...state,
        logIntent: action.payload.logIntent || state.logIntent,
        logs: [...state.logs, action.payload.log],
      };
    }
    case 'toggleLog': {
      return {
        ...state,
        showLog: !state.showLog,
      };
    }
    case 'setLogIntent': {
      return {
        ...state,
        logIntent: action.payload,
      };
    }
    case 'addProjectsSrc': {
      const list = action.payload.filter(path => !state.projectsSrc.includes(path));
      if (!list.length) return state;
      const val: Partial<AppStoreState> = {
        logs: [
          ...state.logs,
          successLogAction(`Folder <strong>${action.payload}</strong> added`)
        ],
        projectsSrc: [...state.projectsSrc, ...list],
      };
      setAppStoreSettings(val);
      return {
        ...state,
        ...val,
      };
    }
    case 'removeProjectsSrc': {
      if (!state.projectsSrc.includes(action.payload)) return { ...state };
      const val: Partial<AppStoreState> = {
        projectsSrc: [...state.projectsSrc.filter(src => src !== action.payload)]
      };
      setAppStoreSettings(val);
      return {
        ...state,
        ...val,
        projects: [...state.projects.filter(project => project.path !== action.payload)],
      };
    }
    case 'clearLog': {
      const val: Partial<AppStoreState> = {
        logs: []
      };
      setAppStoreSettings(val);
      return {
        ...state,
        ...val
      };
    }
    case 'setAppUpdated': {
      return {
        ...state,
        appUpdated: action.payload
      };
    }
    case 'setAppStatus': {
      return {
        ...state,
        appStatus: action.payload
      };
    }
    case 'setMergeFavorites': {
      const val: Partial<AppStoreState> = {
        mergeFavorites: { ...action.payload }
      };
      setAppStoreSettings(val);
      return {
        ...state,
        ...val
      };
    }
    case 'toggle': {
      const val: Partial<AppStoreState> = { [action.payload]: !state[action.payload] };
      setAppStoreSettings(val);
      return { ...state, ...val };
    }
    case 'setAutoFetchInterval': {
      const val: Partial<AppStoreState> = { autoFetchInterval: action.payload };
      setAppStoreSettings(val);
      return { ...state, ...val };
    }
    case 'setOnline':
      return { ...state, online: action.payload };
    case 'setProject': {
      const index = findIndex(state.projects, { repo: action.payload.repo });
      if (index === -1) return state;
      const projects = [...state.projects];
      projects[index]= { ...action.payload };
      return {
        ...state,
        projects
      };
    }
    case 'setProjects':
      return {
        ...state,
        projects: [...action.payload]
      };
    case 'setLoading': {
      const { loading } = state;
      const { payload: { active, name } } = action;
      if (!active) {
        delete loading[name];
        return { ...state, ...loading };
      }
      return {
        ...state,
        loading: {
          ...loading,
          [name]: active
        }
      };
    }
    case 'setGroupId': {
      const val: Partial<AppStoreState> = { groupId: action.payload };
      setAppStoreSettings(val);
      return { ...state, ...val };
    }
    case 'toggleAbout': {
      const { showAbout } = state;
      return {
        ...state,
        showAbout: !showAbout
      };
    }
    case 'setDarkMode': {
      const val: Partial<AppStoreState> = {
        darkMode: action.payload,
      };
      setAppStoreSettings(val);
      return {
        ...state,
        ...val
      };
    }
    case 'setDarkModeOS': {
      const val: Partial<AppStoreState> = {
        ...action.payload,
      };
      setAppStoreSettings(val);
      return {
        ...state,
        ...val
      };
    }
    case 'setProjectSettings': {
      const val: Partial<AppStoreState> = {
        projectsSettings: {
          ...state.projectsSettings,
          [action.payload.repo]: { ...action.payload },
        }
      };
      setAppStoreSettings(val);
      return {
        ...state,
        ...val
      };
    }
    case 'setProjectsSettings': {
      const val: Partial<AppStoreState> = {
        projectsSettings: {
          ...action.payload
        }
      };
      setAppStoreSettings(val);
      return {
        ...state,
        ...val
      };
    }
    case 'addGroup': {
      const val: Partial<AppStoreState> = {
        groups: [
          ...state.groups.filter(group => !defGroupsIds.includes(group.id)),
          action.payload,
        ]
      };
      setAppStoreSettings(val);
      val.groups = [...defGroups, ...val.groups ?? []];
      return {
        ...state,
        ...val
      };
    }
    case 'setGroupFilter': {
      const val: Partial<AppStoreState> = {
        groupFilter: action.payload
      };
      setAppStoreSettings(val);
      return { ...state, ...val };
    }
    case 'setGroups': {
      const newGroups = action.payload.filter(group => !defGroupsIds.includes(group.id));
      const val: Partial<AppStoreState> = {
        groups: [
          ...newGroups
        ]
      };
      setAppStoreSettings(val);
      return {
        ...state,
        groups: [
          ...defGroups,
          ...newGroups
        ]
      };
    }
    case 'toggleCollapsedGroup': {
      const { collapsedGroups } = state;
      collapsedGroups.has(action.payload)
        ? collapsedGroups.delete(action.payload)
        : collapsedGroups.add(action.payload)
      ;
      const val: Partial<AppStoreState> = { collapsedGroups };
      setAppStoreSettings({
        collapsedGroups: Array.from(collapsedGroups)
      } as any);
      return { ...state, ...val };
    }
    default:
      return state;
  }
};
