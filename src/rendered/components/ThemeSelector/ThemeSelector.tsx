import { useDarkMode } from 'rendered/hooks/useDarkMode';

import themeAuto from './assets/img/theme-auto.png';
import themeDark from './assets/img/theme-dark.png';
import themeLight from './assets/img/theme-light.png';
import { Root, ThemeButton } from './ThemeSelector.styles';

export const ThemeSelector = () => {
  const { setTheme, themeSource } = useDarkMode();

  return (
    <Root>
      <ThemeButton
        $active={themeSource === 'system'}
        onClick={() => setTheme('system')}
      >
        <img src={themeAuto} />
        <div>Auto</div>
      </ThemeButton>

      <ThemeButton
        $active={themeSource === 'dark'}
        onClick={() => setTheme('dark')}
      >
        <img src={themeDark} />
        <div>Dark</div>
      </ThemeButton>

      <ThemeButton
        $active={themeSource === 'light'}
        onClick={() => setTheme('light')}
      >
        <img src={themeLight} />
        <div>Light</div>
      </ThemeButton>
    </Root>
  );
};
