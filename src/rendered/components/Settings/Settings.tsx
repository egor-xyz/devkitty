import { Tabs } from '@blueprintjs/core';

import { useAppSettings } from 'rendered/hooks/useAppSettings';

import { Root } from './Settings.styles';
import { SettingsAppearance } from '../SettingsAppearance';
import { SettingsIntegrations } from '../SettingsIntegrations';
import { SettingsGroups } from '../SettingsGroups';

export const Settings = () => {
  const { editors, shells, selectedEditor, selectedShell } = useAppSettings();

  const showIntegrations = Boolean(editors.length && shells.length && selectedEditor && selectedShell);

  return (
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

        {showIntegrations && (
          <Tabs.Tab
            icon="data-lineage"
            id="integrations"
            panel={<SettingsIntegrations />}
            title="Integrations"
          />
        )}

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
};
