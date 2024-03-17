import { Divider, Switch } from '@blueprintjs/core';

import { useAppSettings } from 'rendered/hooks/useAppSettings';

import { ThemeSelector } from '../ThemeSelector';
import { Root } from './SettingsAppearance.styles';

export const SettingsAppearance = () => {
  const { showLogo, set } = useAppSettings();

  return (
    <Root>
      <h2>Appearance</h2>
      <Divider />

      <h3>Color Theme</h3>
      <ThemeSelector />

      <h3>Misc</h3>
      <Divider />

      <Switch
        checked={showLogo}
        label="Show Logo"
        onChange={() => set({ showLogo: !showLogo })}
      />
    </Root>
  );
};
