import { Classes, FocusStyleManager } from '@blueprintjs/core';
import { useDarkMode } from 'renderer/hooks/useDarkMode';
import { useModal } from 'renderer/hooks/useModal';
import { cn } from 'renderer/utils/cn';

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
