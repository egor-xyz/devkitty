import { Classes, Divider, Label, NumericInput, Switch } from '@blueprintjs/core';

import { useAppSettings } from 'rendered/hooks/useAppSettings';

import { Root } from './SettingsActions.styles';

export const SettingsActions = () => {
  const { gitHubActions, set } = useAppSettings();
  const { all, count } = gitHubActions;

  return (
    <Root>
      <h2>GitHub Actions</h2>
      <Divider />

      <Switch
        checked={!all}
        label="Show actions only for current branch"
        onChange={() => set({ gitHubActions: { ...gitHubActions, all: !all } })}
      />

      <Label className={Classes.INLINE}>
        Show actions per repo
        <NumericInput
          leftIcon="list"
          max={5}
          min={1}
          value={count}
          onValueChange={(value) => set({ gitHubActions: { ...gitHubActions, count: value } })}
        />
      </Label>
    </Root>
  );
};
