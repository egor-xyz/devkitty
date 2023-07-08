import { Divider } from '@blueprintjs/core';

import { GroupRenamer } from '../GroupRenamer';
import { Root } from './SettingsGroups.styles';

export const SettingsGroups = () => {
  return (
    <Root>
      <h2>Groups</h2>
      <Divider />

      <p>You can change any group name</p>

      <GroupRenamer />
    </Root>
  );
};
