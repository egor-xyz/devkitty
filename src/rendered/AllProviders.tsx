/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentProps, ComponentType, FC } from 'react';
import { HashRouter } from 'react-router-dom';

type Providers = [ComponentType<any>, ComponentProps<any>?][];

const CombineProviders = (providers: Providers): FC<{ children: any }> =>
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

export const AllProviders = CombineProviders([[HashRouter]]);
