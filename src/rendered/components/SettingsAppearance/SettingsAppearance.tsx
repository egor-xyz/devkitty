import { Divider, Switch } from '@blueprintjs/core';

import { useAppSettings } from 'rendered/hooks/useAppSettings';

import { ThemeSelector } from '../ThemeSelector';
import { Root } from './SettingsAppearance.styles';

export const SettingsAppearance = () => {
  const { showLogo, set, soundEffects } = useAppSettings();

  return (
    <Root>
      <h2>Appearance</h2>
      <Divider />

      <h3>Theme</h3>
      <ThemeSelector />

      <Divider />
      <h3>Theme</h3>

      <Switch
        checked={showLogo}
        label="Show Logo"
        onChange={() => set({ showLogo: !showLogo })}
      />

      <Switch
        checked={soundEffects}
        label="Sound Effects"
        onChange={() => set({ soundEffects: !soundEffects })}
      />
    </Root>
  );
};
