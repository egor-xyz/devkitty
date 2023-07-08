import { Tabs } from '@blueprintjs/core';

import { Root } from './Settings.styles';
import { SettingsAppearance } from '../SettingsAppearance';
import { SettingsIntegrations } from '../SettingsIntegrations';
import { SettingsGroups } from '../SettingsGroups';

export const Settings = () => (
  <Root>
    <Tabs
      vertical
      defaultSelectedTabId="appearance"
    >
      <Tabs.Tab
        icon="style"
        id="appearance"
        panel={<SettingsAppearance />}
        title="Appearance"
      />

      <Tabs.Tab
        icon="data-lineage"
        id="integrations"
        panel={<SettingsIntegrations />}
        title="Integrations"
      />

      <Tabs.Tab
        icon="group-objects"
        id="groups"
        panel={<SettingsGroups />}
        title="Groups"
      />

      <Tabs.Expander />
    </Tabs>
  </Root>
);
