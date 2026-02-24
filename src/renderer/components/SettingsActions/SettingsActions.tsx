import { Divider, Label, NumericInput, Switch, Tag } from '@blueprintjs/core';
import { useAppSettings } from 'renderer/hooks/useAppSettings';

export const SettingsActions = () => {
  const { gitHubActions, gitHubPulls, set } = useAppSettings();
  const { all, count, ignoreDependabot = false, ignoredWorkflows = [], inProgress } = gitHubActions;
  const pullsIntervalMinutes = Math.max(1, Math.round(gitHubPulls.pollInterval / 60000));

  const removeIgnored = (name: string) => {
    set({ gitHubActions: { ...gitHubActions, ignoredWorkflows: ignoredWorkflows.filter((w) => w !== name) } });
  };

  return (
    <div className="select-none p-4">
      <h2 className="text-xl font-semibold mb-1">GitHub</h2>
      <Divider />
      <h3 className="text-sm font-semibold mt-4 mb-2.5">Pull Requests</h3>

      <Label>
        Polling interval (minutes)
        <NumericInput
          max={60}
          min={1}
          onValueChange={(value) => set({ gitHubPulls: { ...gitHubPulls, pollInterval: value * 60000 } })}
          value={pullsIntervalMinutes}
        />
      </Label>

      <Divider />
      <h3 className="text-sm font-semibold mt-4 mb-2.5">Actions</h3>

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

      {ignoredWorkflows.length > 0 && (
        <>
          <h4 className="text-xs font-semibold mt-4 mb-2">Ignored workflows</h4>

          <div className="flex flex-wrap gap-1.5">
            {ignoredWorkflows.map((name) => (
              <Tag
                key={name}
                onRemove={() => removeIgnored(name)}
              >
                {name}
              </Tag>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
