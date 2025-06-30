import { useDarkMode } from 'rendered/hooks/useDarkMode';

import themeAuto from './assets/img/theme-auto.png';
import themeDark from './assets/img/theme-dark.png';
import themeLight from './assets/img/theme-light.png';

export const ThemeSelector = () => {
  const { setTheme, themeSource } = useDarkMode();

  return (
    <div className="w-[420px] flex justify-between mx-auto mb-5">
      <div
        className="text-center cursor-pointer flex flex-col justify-between gap-1 text-sm"
        onClick={() => setTheme('system')}
      >
        <img 
          className={`overflow-hidden block rounded-xl w-[120px] border-3 object-cover ${
            themeSource === 'system' ? 'border-blueprint-blue3' : 'border-transparent'
          }`} 
          src={themeAuto}
        />

        <div>Auto</div>
      </div>

      <div
        className="text-center cursor-pointer flex flex-col justify-between gap-1 text-sm"
        onClick={() => setTheme('dark')}
      >
        <img 
          className={`overflow-hidden block rounded-xl w-[120px] border-3 object-cover ${
            themeSource === 'dark' ? 'border-blueprint-blue3' : 'border-transparent'
          }`} 
          src={themeDark}
        />

        <div>Dark</div>
      </div>

      <div
        className="text-center cursor-pointer flex flex-col justify-between gap-1 text-sm"
        onClick={() => setTheme('light')}
      >
        <img 
          className={`overflow-hidden block rounded-xl w-[120px] border-3 object-cover ${
            themeSource === 'light' ? 'border-blueprint-blue3' : 'border-transparent'
          }`} 
          src={themeLight}
        />

        <div>Light</div>
      </div>
    </div>
  );
};
