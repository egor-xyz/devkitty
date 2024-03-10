import { Divider, Switch } from '@blueprintjs/core';

import { useAppSettings } from 'rendered/hooks/useAppSettings';

import { GroupRename } from '../GroupRename';
import { Root } from './SettingsGroups.styles';

export const SettingsGroups = () => {
  const { oldFashionGroups, set } = useAppSettings();
  return (
    <Root>
      <h2>Groups style</h2>
      <Divider />

      <h3>Style</h3>
      <Switch
        checked={oldFashionGroups}
        label={'"Old fashion" groups'}
        onChange={() => set({ oldFashionGroups: !oldFashionGroups })}
      />

      <Divider />

      <h3>Rename</h3>
      <p>You can change any group name</p>

      <GroupRename />
    </Root>
  );
};
