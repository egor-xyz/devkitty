import { Divider, Label, NumericInput, Switch } from '@blueprintjs/core';
import { useAppSettings } from 'rendered/hooks/useAppSettings';

import { Root } from './SettingsActions.styles';

export const SettingsActions = () => {
  const { gitHubActions, set } = useAppSettings();
  const { all, count, inProgress } = gitHubActions;

  return (
    <Root>
      <h2>GitHub Actions</h2>
      <Divider />

      <Label>
        Amount of actions to show under the project
        <NumericInput
          max={5}
          min={1}
          onValueChange={(value) => set({ gitHubActions: { ...gitHubActions, count: value } })}
          value={count}
        />
      </Label>

      <br />

      <Switch
        checked={!all}
        label="Show actions only for current branch"
        onChange={() => set({ gitHubActions: { ...gitHubActions, all: !all } })}
      />

      <Switch
        checked={inProgress}
        label="Display ongoing actions and those completed within the last 30 minutes"
        onChange={() => set({ gitHubActions: { ...gitHubActions, inProgress: !inProgress } })}
      />
    </Root>
  );
};
