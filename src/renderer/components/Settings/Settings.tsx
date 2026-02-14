import { Tabs } from '@blueprintjs/core';
import { useNavigate, useParams } from 'react-router';
import { GitHubIcon } from 'renderer/assets/gitHubIcons';

import { SettingsActions } from '../SettingsActions';
import { SettingsAppearance } from '../SettingsAppearance';
import { SettingsIntegrations } from '../SettingsIntegrations';

export const Settings = () => {
  const { id = 'appearance' } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const handleTabChange = (id: string) => {
    navigate(`/settings/${id}`);
  };

  return (
    <div className="h-[calc(100vh-50px)] settings-root">
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
          icon={<GitHubIcon className="mr-1.5 w-4 h-4" />}
          id="github"
          panel={<SettingsActions />}
          title="GitHub"
        />
      </Tabs>
    </div>
  );
};
