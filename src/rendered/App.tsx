import { Classes, FocusStyleManager } from '@blueprintjs/core';
import { useDarkMode } from 'rendered/hooks/useDarkMode';
import { useModal } from 'rendered/hooks/useModal';

import { AppNavbar } from './components/AppNavbar';
import { Routing } from './Routing';

FocusStyleManager.onlyShowFocusOnTabs();

export const App = () => {
  const { darkMode } = useDarkMode();
  const { Modal } = useModal();

  return (
    <div className={`flex w-full relative flex-col bg-blueprint-light-gray5 dark:bg-blueprint-dark-gray1 ${darkMode ? Classes.DARK : ''}`}>
      <AppNavbar />
      <Routing />
      <Modal />
    </div>
  );
};
