import { createContext, Dispatch, FC, useContext, useEffect, useMemo, useReducer } from 'react';
import { darkMode } from 'electron-util';

import { AppStoreActions, AppStoreState, Reducer, reducer } from 'context';
import { getSavedState, scanFolders } from 'utils';
import { defGroups } from 'models';

const initialState: AppStoreState = {
  autoFetch: true,
  autoFetchInterval: 1,
  bottomBar: false,
  collapsedGroups: new Set(),
  darkMode: darkMode.isEnabled,
  darkModeOS: true,
  groupFilter: false,
  groupId: '0',
  groups: defGroups,
  loading: {},
  logIntent: 'none',
  logs: [],
  mergeFavorites: {},
  online: navigator.onLine,
  projectInfo: false,
  projects: [],
  projectsSettings: {},
  projectsSrc: [],
  projectsWithError: [],
  showAbout: false,
  showLog: false,
  showLogo: true,
  snow: false,
  ...getSavedState()
};

export const appStoreContext = createContext<AppStoreState>({} as any);
export const appStoreReducerContext = createContext<Dispatch<AppStoreActions>>(() => { });

export const AppStoreProvider: FC = ({ children }) => {
  const [state, dispatch] = useReducer<Reducer<AppStoreState, AppStoreActions>>(reducer, initialState);

  // interceptors
  useEffect(() => {
    scanFolders({ dispatch, state, useLoader: true });
  }, [state.projectsSrc]); // eslint-disable-line

  const value = useMemo(() => state, [state]);
  return (
    <appStoreContext.Provider value={value} >
      <appStoreReducerContext.Provider value={dispatch}>
        {children}
      </appStoreReducerContext.Provider>
    </appStoreContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(appStoreContext);
  if (context === undefined) {
    throw new Error('appStoreContext must be used within a CountProvider');
  }
  return context;
};
export const useAppStoreDispatch = () => {
  const context = useContext(appStoreReducerContext);
  if (context === undefined) {
    throw new Error('appStoreReducerContext must be used within a CountProvider');
  }
  return context;
};
