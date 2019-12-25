import { createContext, FC, useContext, useMemo, useState } from 'react';

export type ModalsStoreState = {
  data?: any;
  name: undefined
  | 'merge'
  | 'stash'
  | 'pullRequest'
  | 'deleteProject'
  | 'deleteBranch'
  | 'jenkinsJob'
  | 'jenkinsServer'
  | 'console'
  ;
  prevModal?: ModalsStoreState;
};

export type ModalsStore = ModalsStoreState & {
  closeModal(): void;
  openModal(state: ModalsStoreState): void;
}

export const modalsStore = createContext({} as ModalsStore);

const initialState: ModalsStoreState = {
  data: undefined,
  name: undefined
};

export const ModalsStoreProvider:FC = ({ children }) => {
  const [state, openModal] = useState<ModalsStoreState>(initialState);

  const closeModal = () => {
    openModal({
      data: undefined,
      name: undefined,
      ...state.prevModal ?? {}
    });
  };

  const value: ModalsStore = useMemo(() => ({
    ...state,
    closeModal,
    openModal,
  }), [state]); // eslint-disable-line
  return <modalsStore.Provider value={value}>{children}</modalsStore.Provider>;
};

export const useModalsStore = () => useContext(modalsStore);