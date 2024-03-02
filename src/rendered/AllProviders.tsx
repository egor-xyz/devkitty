import { ComponentProps, ComponentType, FC, ReactNode } from 'react';
import { HashRouter } from 'react-router-dom';
import { OverlaysProvider } from '@blueprintjs/core';

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

export const AllProviders = CombineProviders([[HashRouter, OverlaysProvider]]);
