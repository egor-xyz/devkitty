import { Classes, FocusStyleManager } from '@blueprintjs/core';
import { ThemeProvider } from 'styled-components';

import { useDarkMode } from 'rendered/hooks/useDarkMode';
import { useModal } from 'rendered/hooks/useModal';

import { Root } from './App.styles';
import { Routing } from './Routing';
import { GlobalStyles, darkTheme, defaultTheme } from './Theme';
import { AppNavbar } from './components/AppNavbar';

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
