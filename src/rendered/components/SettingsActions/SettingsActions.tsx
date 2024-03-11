import { Divider, Switch } from '@blueprintjs/core';

import { useAppSettings } from 'rendered/hooks/useAppSettings';

import { Root } from './SettingsActions.styles';

export const SettingsActions = () => {
  const { gitHubActions, set } = useAppSettings();
  const { all } = gitHubActions;

  return (
    <Root>
      <h2>GitHub Actions</h2>
      <Divider />

      <Switch
        checked={!all}
        label="Show actions only for current branch"
        onChange={() => set({ gitHubActions: { ...gitHubActions, all: !all } })}
      />
    </Root>
  );
};
