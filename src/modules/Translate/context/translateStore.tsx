import { createContext, FC, useContext, useMemo, useState } from 'react';
import { getSync, set } from 'electron-settings';

import { TRANSLATE } from 'modules/Translate';

import { TranslateStoreState } from '.';

const initialState: TranslateStoreState = {
  clientEmail: '',
  isActive: false,
  privateKey: '',
  ...(getSync(TRANSLATE) ?? {}) as Partial<TranslateStoreState>
};

export type TranslateStore = TranslateStoreState & {
  setState(newState: Partial<TranslateStoreState>): void;
}

export const translateStore = createContext({} as TranslateStore);

export const TranslatetoreProvider:FC = ({ children }) => {
  const [state, setContextState] = useState<TranslateStoreState>(initialState);

  const setState = (values: Partial<TranslateStoreState>):void => {
    const newState = { ...state, ...values };
    set(TRANSLATE, newState as any);
    setContextState(newState);
  };

  const value: TranslateStore = useMemo(() => ({
    ...state,
    setState,
  }), [state]); // eslint-disable-line
  return <translateStore.Provider value={value}>{children}</translateStore.Provider>;
};

export const useTranslateStore = () => useContext(translateStore);