import { Tabs } from '@blueprintjs/core';
import { useNavigate, useParams } from 'react-router';

import { SettingsActions } from '../SettingsActions';
import { SettingsAppearance } from '../SettingsAppearance';
import { SettingsIntegrations } from '../SettingsIntegrations';
import { Root, StyledActionsIcon } from './Settings.styles';

export const Settings = () => {
  const { id = 'appearance' } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const handleTabChange = (id: string) => {
    navigate(`/settings/${id}`);
  };

  return (
    <Root>
      <Tabs
        defaultSelectedTabId={id}
        onChange={handleTabChange}
        vertical
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
          id="github"
          panel={<SettingsActions />}
          title="GitHub"
        />
      </Tabs>
    </Root>
  );
};
