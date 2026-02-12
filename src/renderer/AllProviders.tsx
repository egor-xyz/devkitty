/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
/* eslint-disable react/display-name */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { BlueprintProvider } from '@blueprintjs/core';
import { type ComponentProps, type ComponentType, type FC, type ReactNode } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { HashRouter } from 'react-router';

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
