import { Classes, FocusStyleManager } from '@blueprintjs/core';
import { useEffect } from 'react';
import { ThemeProvider } from 'styled-components';

import { useDarkMode } from 'rendered/hooks/useDarkMode';
import { useModal } from 'rendered/hooks/useModal';

import { Root } from './App.styles';
import { Routing } from './Routing';
import { GlobalStyles, darkTheme, defaultTheme } from './Theme';
import { AppNavbar } from './components/AppNavbar';
import { useGroups } from './hooks/useGroups';

FocusStyleManager.onlyShowFocusOnTabs();

export const App = () => {
  const { darkMode } = useDarkMode();
  const { Modal } = useModal();
  const { unselectCollapsed, unselectAll, selectedGroups, collapsedGroups } = useGroups();

  const theme = darkMode ? darkTheme : defaultTheme;

  useEffect(() => {
    //TODO: tmp fix for groups if they not array
    if (!Array.isArray(selectedGroups) || !Array.isArray(collapsedGroups)) {
      unselectCollapsed();
      unselectAll();
    }
  }, [selectedGroups, collapsedGroups]);

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
