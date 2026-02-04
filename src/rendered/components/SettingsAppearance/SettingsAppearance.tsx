import { Divider, Switch } from '@blueprintjs/core';
import { useAppSettings } from 'rendered/hooks/useAppSettings';

import { ThemeSelector } from '../ThemeSelector';

export const SettingsAppearance = () => {
  const { set, showLogo } = useAppSettings();

  return (
    <div className="select-none p-4">
      <h2 className="text-xl font-semibold mb-1">Appearance</h2>
      <Divider />
      <h3 className="text-sm font-semibold mt-4 mb-2.5">Color Theme</h3>
      <ThemeSelector />
      <h3 className="text-sm font-semibold mt-4 mb-2.5">Misc</h3>
      <Divider />

      <Switch
        checked={showLogo}
        className="mt-4"
        label="Show Logo"
        onChange={() => set({ showLogo: !showLogo })}
      />
    </div>
  );
};
