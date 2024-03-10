import { Tabs } from '@blueprintjs/core';
import { useParams, useNavigate } from 'react-router-dom';

import { Root } from './Settings.styles';
import { SettingsAppearance } from '../SettingsAppearance';
import { SettingsIntegrations } from '../SettingsIntegrations';
import { SettingsGroups } from '../SettingsGroups';

export const Settings = () => {
  // take id from query string
  const { id = 'appearance' } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const handleTabChange = (id: string) => {
    console.log('id', id);
    navigate(`/settings/${id}`);
  };

  return (
    <Root>
      <Tabs
        vertical
        defaultSelectedTabId={id}
        onChange={handleTabChange}
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
      </Tabs>
    </Root>
  );
};
