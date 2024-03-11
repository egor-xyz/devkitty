import { Tabs } from '@blueprintjs/core';
import { useParams, useNavigate } from 'react-router-dom';

import { useAppSettings } from 'rendered/hooks/useAppSettings';

import { Root, StyledActionsIcon } from './Settings.styles';
import { SettingsAppearance } from '../SettingsAppearance';
import { SettingsIntegrations } from '../SettingsIntegrations';
import { SettingsGroups } from '../SettingsGroups';
import { SettingsActions } from '../SettingsActions';

export const Settings = () => {
  const { id = 'appearance' } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { oldFashionGroups } = useAppSettings();

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

        {oldFashionGroups && (
          <Tabs.Tab
            icon="group-objects"
            id="groups"
            panel={<SettingsGroups />}
            title="Groups"
          />
        )}
      </Tabs>
    </Root>
  );
};
