import { Divider, Switch } from '@blueprintjs/core';
import { useAppSettings } from 'renderer/hooks/useAppSettings';

import { StyleSelector } from '../StyleSelector';
import { ThemeSelector } from '../ThemeSelector';

export const SettingsAppearance = () => {
  const { autoUpdate, set, showLogo, showWorktrees } = useAppSettings();

  return (
    <div className="select-none p-4">
      <h2 className="text-xl font-semibold mb-1">Appearance</h2>
      <Divider />
      <h3 className="text-sm font-semibold mt-4 mb-2.5">Color Theme</h3>
      <ThemeSelector />
      <Divider className="my-6!" />
      <h3 className="text-sm font-semibold mt-4 mb-2.5">Style</h3>
      <StyleSelector />
      <Divider className="my-6!" />
      <h3 className="text-sm font-semibold mt-4 mb-2.5">Updates</h3>

      <Switch
        checked={autoUpdate ?? true}
        className="mt-4 mb-1"
        label="Auto update"
        onChange={() => set({ autoUpdate: !(autoUpdate ?? true) })}
      />

      <p className="text-xs text-bp-gray-1 dark:text-bp-gray-4">
        Download updates in the background. You choose when to restart. Turn this off to download with Update in the top bar.
      </p>

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
