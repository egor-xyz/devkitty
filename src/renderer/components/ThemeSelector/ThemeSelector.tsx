import { useDarkMode } from 'renderer/hooks/useDarkMode';
import { cn } from 'renderer/utils/cn';

import themeAuto from './assets/img/theme-auto.png';
import themeDark from './assets/img/theme-dark.png';
import themeLight from './assets/img/theme-light.png';

export const ThemeSelector = () => {
  const { setTheme, themeSource } = useDarkMode();

  const buttonClass = 'flex flex-col items-center gap-1.5 rounded-lg p-1 text-center text-sm leading-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500';
  const imgClass = (active: boolean) =>
    cn(
      'overflow-hidden block rounded-xl w-[120px] border-3 border-transparent object-cover',
      active && 'border-blue-500 ring-2 ring-blue-400 ring-offset-2 ring-offset-transparent'
    );

  return (
    <div className="flex w-full flex-wrap justify-start gap-x-4 gap-y-3">
      <button
        aria-pressed={themeSource === 'system'}
        className={buttonClass}
        onClick={() => setTheme('system')}
        type="button"
      >
        <img
          alt=""
          className={imgClass(themeSource === 'system')}
          src={themeAuto}
        />

        <span>Auto</span>
      </button>

      <button
        aria-pressed={themeSource === 'dark'}
        className={buttonClass}
        onClick={() => setTheme('dark')}
        type="button"
      >
        <img
          alt=""
          className={imgClass(themeSource === 'dark')}
          src={themeDark}
        />

        <span>Dark</span>
      </button>

      <button
        aria-pressed={themeSource === 'light'}
        className={buttonClass}
        onClick={() => setTheme('light')}
        type="button"
      >
        <img
          alt=""
          className={imgClass(themeSource === 'light')}
          src={themeLight}
        />

        <span>Light</span>
      </button>
    </div>
  );
};
