import { Divider, Switch } from '@blueprintjs/core';
import { useAppSettings } from 'renderer/hooks/useAppSettings';

import { ThemeSelector } from '../ThemeSelector';

export const SettingsAppearance = () => {
  const { set, showLogo, showWorktrees } = useAppSettings();

  return (
    <div className="select-none p-4">
      <h2 className="text-xl font-semibold mb-1">Appearance</h2>
      <Divider />
      <h3 className="text-sm font-semibold mt-4 mb-2.5">Color Theme</h3>
      <ThemeSelector />
      <Divider className="my-6!" />
      <h3 className="text-sm font-semibold mt-4 mb-2.5">Git</h3>

      <Switch
        checked={showWorktrees}
        className="mt-4"
        label="Worktrees"
        onChange={() => set({ showWorktrees: !showWorktrees })}
      />

      <Divider className="my-6!" />
      <h3 className="text-sm font-semibold mt-4 mb-2.5">Misc</h3>

      <Switch
        checked={showLogo}
        className="mt-4"
        label="Logo"
        onChange={() => set({ showLogo: !showLogo })}
      />
    </div>
  );
};
