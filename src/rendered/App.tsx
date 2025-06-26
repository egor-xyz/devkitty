import { Classes, FocusStyleManager } from '@blueprintjs/core';
import { useDarkMode } from 'rendered/hooks/useDarkMode';
import { useModal } from 'rendered/hooks/useModal';
import { ThemeProvider } from 'styled-components';

import { Root } from './App.styles';
import { AppNavbar } from './components/AppNavbar';
import { Routing } from './Routing';
import { darkTheme, defaultTheme, GlobalStyles } from './Theme';

FocusStyleManager.onlyShowFocusOnTabs();

export const App = () => {
  const { darkMode } = useDarkMode();
  const { Modal } = useModal();

  const theme = darkMode ? darkTheme : defaultTheme;

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />

      <Root className={darkMode && Classes.DARK}>
        <AppNavbar />
        <Routing />
        <Modal />
      </Root>
    </ThemeProvider>
  );
};
