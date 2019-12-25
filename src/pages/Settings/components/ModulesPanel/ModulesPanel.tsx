import { FC } from 'react';
import { Tab, Tabs } from '@blueprintjs/core';

import { TranslateSettingsPanel } from 'modules/Translate';
import { JenkinsSettingsPanel } from 'modules/Jenkins';

export const ModulesPanel: FC = () => {
  return (
    <Tabs
      id='settings'
      renderActiveTabPanelOnly={true}
    >
      <Tab
        id='jenkins'
        panel={<JenkinsSettingsPanel />}
        title='Jenkins'
      />
      <Tab
        id='translate'
        panel={<TranslateSettingsPanel />}
        title='Translate'
      />
    </Tabs>
  );
};