import { Classes, FocusStyleManager } from '@blueprintjs/core';
import { useDarkMode } from 'rendered/hooks/useDarkMode';
import { useModal } from 'rendered/hooks/useModal';
import { cn } from 'rendered/utils/cn';

import { AppNavbar } from './components/AppNavbar';
import { Routing } from './Routing';

FocusStyleManager.onlyShowFocusOnTabs();

export const App = () => {
  const { darkMode } = useDarkMode();
  const { Modal } = useModal();

  return (
    <div className={cn('flex w-full relative flex-col', darkMode && [Classes.DARK, 'dark'])}>
      <AppNavbar />
      <Routing />
      <Modal />
    </div>
  );
};
