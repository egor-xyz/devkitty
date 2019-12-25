import { FC } from 'react';

import { ModalsStoreProvider } from 'modals';
import { JenkinsStoreProvider } from 'modules/Jenkins';
import { TranslatetoreProvider } from 'modules/Translate';

export const AllProviders: FC = ({ children }) => (
  <ModalsStoreProvider >
    <JenkinsStoreProvider>
      <TranslatetoreProvider>
        {children}
      </TranslatetoreProvider>
    </JenkinsStoreProvider>
  </ModalsStoreProvider>
);
