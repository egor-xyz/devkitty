import { Divider } from '@blueprintjs/core';

import { GroupRename } from '../GroupRename';
import { Root } from './SettingsGroups.styles';

export const SettingsGroups = () => {
  return (
    <Root>
      <h2>Groups</h2>
      <Divider />

      <h3>Rename</h3>
      <p>You can change any group name</p>

      <GroupRename />
    </Root>
  );
};
