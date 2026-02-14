import { Divider, Switch } from '@blueprintjs/core';
import { useAppSettings } from 'renderer/hooks/useAppSettings';

export const SettingsGit = () => {
  const { set, showWorktrees } = useAppSettings();

  return (
    <div className="select-none p-4">
      <h2 className="text-xl font-semibold mb-1">Git</h2>
      <Divider />

      <h3 className="text-sm font-semibold mt-4 mb-2.5">Worktrees</h3>
      <Divider />

      <Switch
        checked={showWorktrees}
        className="mt-4"
        label="Show Worktrees"
        onChange={() => set({ showWorktrees: !showWorktrees })}
      />
    </div>
  );
};
