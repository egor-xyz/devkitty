import { Classes, FocusStyleManager } from '@blueprintjs/core';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { useClaudeUsage } from 'renderer/hooks/useClaudeUsage';
import { useDarkMode } from 'renderer/hooks/useDarkMode';
import { useModal } from 'renderer/hooks/useModal';
import { cn } from 'renderer/utils/cn';

import { AppNavbar } from './components/AppNavbar';
import { ClaudeFooter } from './components/ClaudeUsage';
import { Routing } from './Routing';

FocusStyleManager.onlyShowFocusOnTabs();

export const App = () => {
  const { darkMode } = useDarkMode();
  const { Modal } = useModal();
  const { showClaudeUsage } = useAppSettings();
  const hasAccounts = useClaudeUsage((s) => s.accounts.length > 0);
  const footerVisible = showClaudeUsage && hasAccounts;

  return (
    <div
      className={cn(
        'flex w-full relative flex-col',
        footerVisible && 'has-claude-footer',
        darkMode && [Classes.DARK, 'dark']
      )}
    >
      <AppNavbar />
      <Routing />
      <Modal />
      <ClaudeFooter />
    </div>
  );
};
