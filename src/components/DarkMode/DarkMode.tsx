import { FC, useMemo } from 'react';
import clsx from 'clsx';
import { darkMode } from 'electron-util';

import { useAppStore, useAppStoreDispatch } from 'context';
import themeDark from 'assets/img/theme-dark.png';
import themeLight from 'assets/img/theme-light.png';
import themeAuto from 'assets/img/theme-auto.png';

import css from './DarkMode.module.scss';

export const DarkMode:FC = () => {
  const { darkMode: _darkMode, darkModeOS } = useAppStore();
  const dispatch = useAppStoreDispatch();

  const setOSTheme = () => {
    if (darkModeOS) return;
    dispatch({
      payload: {
        darkMode: darkMode.isEnabled,
        darkModeOS: true
      },
      type: 'setDarkModeOS'
    });
  };

  const setTheme = (dark: boolean) => {
    if (!darkModeOS && dark === _darkMode) return;
    dispatch({
      payload: {
        darkMode: dark,
        darkModeOS: false
      },
      type: 'setDarkModeOS'
    });
  };

  return useMemo(() => (<div className={css.root}>
    <div
      className={css.imgBtn}
      onClick={setOSTheme}
    >
      <img
        alt=''
        className={clsx(css.img, { [css.active]: darkModeOS })}
        src={themeAuto}
      />
      <div className={css.title}>Auto</div>
    </div>

    <div
      className={css.imgBtn}
      onClick={() => setTheme(true)}
    >
      <img
        alt=''
        className={clsx(css.img, { [css.active]: !darkModeOS && _darkMode })}
        src={themeDark}
      />
      <div className={css.title}>Dark</div>
    </div>

    <div
      className={css.imgBtn}
      onClick={() => setTheme(false)}
    >
      <img
        alt=''
        className={clsx(css.img, { [css.active]: !darkModeOS && !_darkMode })}
        src={themeLight}
      />
      <div className={css.title}>Light</div>
    </div>
  </div>), [darkModeOS, _darkMode]); // eslint-disable-line
};