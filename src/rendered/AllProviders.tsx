import { BlueprintProvider } from '@blueprintjs/core';
import { ComponentProps, ComponentType, FC, ReactNode } from 'react';
import { HashRouter } from 'react-router-dom';

type Providers = [ComponentType<any>, ComponentProps<any>?][];

const CombineProviders = (providers: Providers): FC<{ children: ReactNode }> =>
  providers.reduce(
    (AccumulatedProviders, [Provider, props = {}]) =>
      ({ children }) =>
        (
          <AccumulatedProviders>
            <Provider {...props}>
              <>{children}</>
            </Provider>
          </AccumulatedProviders>
        ),
    ({ children }) => <>{children}</>
  );

export const AllProviders = CombineProviders([[HashRouter, BlueprintProvider]]);
