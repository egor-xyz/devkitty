import { Tabs } from '@blueprintjs/core';
import { useParams, useNavigate } from 'react-router-dom';

import { Root, StyledActionsIcon } from './Settings.styles';
import { SettingsAppearance } from '../SettingsAppearance';
import { SettingsIntegrations } from '../SettingsIntegrations';
import { SettingsActions } from '../SettingsActions';

export const Settings = () => {
  const { id = 'appearance' } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const handleTabChange = (id: string) => {
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
          icon={<StyledActionsIcon />}
          id="actions"
          panel={<SettingsActions />}
          title="Actions"
        />
      </Tabs>
    </Root>
  );
};
