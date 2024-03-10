import { BlueprintProvider } from '@blueprintjs/core';
import { ComponentProps, ComponentType, FC, ReactNode } from 'react';
import { HashRouter } from 'react-router-dom';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';

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

export const AllProviders = CombineProviders([
  [HashRouter],
  [BlueprintProvider],
  [DndProvider, { backend: HTML5Backend }]
]);
