import { FC } from 'react';
import { Card, Tab, Tabs } from '@blueprintjs/core';
import clsx from 'clsx';

import { AdvancedPanel, AppearancePanel, AutomationPanel, IntegrationsPanel, ModulesPanel } from './components';
import css from './Settings.module.scss';

export const Settings: FC = () => (
  <div className={clsx(css.root, css.tabs)}>
    <Card className={css.card}>
      <Tabs
        id='settings'
        renderActiveTabPanelOnly={true}
      >
        <Tab
          id='appearance'
          panel={<AppearancePanel />}
          title='Appearance'
        />
        <Tab
          id='ide'
          panel={<IntegrationsPanel />}
          title='Integrations'
        />
        <Tab
          id='automation'
          panel={<AutomationPanel />}
          title='Automation'
        />
        <Tab
          id='modules'
          panel={<ModulesPanel />}
          title='Modules'
        />
        <Tab
          id='advanced'
          panel={<AdvancedPanel />}
          title='Advanced'
        />
      </Tabs>
    </Card>
  </div>
);