import { Divider, Label, NumericInput, Switch } from '@blueprintjs/core';
import { useAppSettings } from 'rendered/hooks/useAppSettings';

import { Root } from './SettingsActions.styles';

export const SettingsActions = () => {
  const { gitHubActions, gitHubPulls, set } = useAppSettings();
  const { all, count, ignoreDependabot = false, inProgress } = gitHubActions;
  const pullsIntervalMinutes = Math.max(1, Math.round(gitHubPulls.pollInterval / 60000));

  return (
    <Root>
      <h2>GitHub</h2>
      <Divider />
      <h3>Actions</h3>

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

      <Switch
        checked={ignoreDependabot}
        label="Ignore Dependabot"
        onChange={() => set({ gitHubActions: { ...gitHubActions, ignoreDependabot: !ignoreDependabot } })}
      />

      <Divider />
      <h3>Pull Requests</h3>

      <Label>
        Polling interval (minutes)
        <NumericInput
          max={60}
          min={1}
          onValueChange={(value) => set({ gitHubPulls: { ...gitHubPulls, pollInterval: value * 60000 } })}
          value={pullsIntervalMinutes}
        />
      </Label>
    </Root>
  );
};
