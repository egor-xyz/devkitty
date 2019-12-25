import { FC } from 'react';
import { Button, Divider } from '@blueprintjs/core';

import { exportAllSettings, importAllSettings, resetAllSettings } from 'utils';

import css from '../../Settings.module.scss';

export const AdvancedPanel: FC = () => (
  <div className={css.root}>
    <div className={css.sectionHeader}>Export/Import application settings</div>
    <Button
      text={'Export'}
      onClick={exportAllSettings}
    />
    <Button
      className={css.ml}
      text={'Import'}
      onClick={importAllSettings}
    />

    <Divider className={css.divider} />

    <div className={css.sectionHeader}>Danger zone</div>
    <div className={css.sectionDesc}>
              Be careful with this option. It will reset all aplication settings!
    </div>

    <Button
      intent={'danger'}
      text={'Reset All Settings'}
      onClick={resetAllSettings}
    />
  </div>
);