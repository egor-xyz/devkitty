import { useDarkMode } from 'rendered/hooks/useDarkMode';
import { cn } from 'rendered/utils/cn';

import themeAuto from './assets/img/theme-auto.png';
import themeDark from './assets/img/theme-dark.png';
import themeLight from './assets/img/theme-light.png';

export const ThemeSelector = () => {
  const { setTheme, themeSource } = useDarkMode();

  const buttonClass = 'text-center cursor-pointer flex flex-col justify-between gap-1 text-[13px]';
  const imgClass = (active: boolean) =>
    cn('overflow-hidden block rounded-xl w-[120px] border-3 border-transparent object-cover', active && 'border-blue-500');

  return (
    <div className="w-[420px] flex justify-between mx-auto mb-5">
      <div
        className={buttonClass}
        onClick={() => setTheme('system')}
      >
        <img
          className={imgClass(themeSource === 'system')}
          src={themeAuto}
        />

        <div>Auto</div>
      </div>

      <div
        className={buttonClass}
        onClick={() => setTheme('dark')}
      >
        <img
          className={imgClass(themeSource === 'dark')}
          src={themeDark}
        />

        <div>Dark</div>
      </div>

      <div
        className={buttonClass}
        onClick={() => setTheme('light')}
      >
        <img
          className={imgClass(themeSource === 'light')}
          src={themeLight}
        />

        <div>Light</div>
      </div>
    </div>
  );
};
