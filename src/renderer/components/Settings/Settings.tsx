import { Button, Tabs } from '@blueprintjs/core';
import { useNavigate, useParams } from 'react-router';
import { GitHubIcon } from 'renderer/assets/gitHubIcons';
import { useIsSunset } from 'renderer/hooks/useAppSettings';
import { cn } from 'renderer/utils/cn';

import { SettingsActions } from '../SettingsActions';
import { SettingsAppearance } from '../SettingsAppearance';
import { SettingsIntegrations } from '../SettingsIntegrations';

export const Settings = () => {
  const { id = 'appearance' } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isSunset = useIsSunset();

  const handleTabChange = (id: string) => {
    navigate(`/settings/${id}`);
  };

  return (
    <div className={cn('relative h-[calc(100vh-50px-var(--claude-footer-h))] settings-root', isSunset && 'theme-sunset')}>
      <Button
        aria-label="Close settings"
        className="absolute top-3 right-3 z-10"
        icon="cross"
        minimal
        onClick={() => navigate('/')}
      />

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
