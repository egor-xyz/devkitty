import { createContext, FC, useContext, useMemo, useState } from 'react';
import { getSync, set } from 'electron-settings';

import { JenkinsStoreState } from '.';
import { JENKINS } from '../utils';

const initialState: JenkinsStoreState = {
  isActive: true,
  jobs: [],
  runningBuilds: [],
  servers: [],
  ...(getSync(JENKINS) ?? {}) as Partial<JenkinsStoreState>
};

export type JenkinsStore = JenkinsStoreState & {
  setState(newState: Partial<JenkinsStoreState>): void;
}

export const jenkinsStore = createContext({} as JenkinsStore);

export const JenkinsStoreProvider:FC = ({ children }) => {
  const [state, setContextState] = useState<JenkinsStoreState>(initialState);

  const setState = (values: Partial<JenkinsStoreState>):void => {
    const newState = { ...state, ...values };
    set(JENKINS, newState as any);
    setContextState(newState);
  };

  const value: JenkinsStore = useMemo(() => ({
    ...state,
    setState,
  }), [state]); // eslint-disable-line
  return <jenkinsStore.Provider value={value}>{children}</jenkinsStore.Provider>;
};

export const useJenkinsStore = () => useContext(jenkinsStore);