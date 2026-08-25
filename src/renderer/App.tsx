import { Classes, FocusStyleManager } from '@blueprintjs/core';
import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useAppSettings, useIsSunset } from 'renderer/hooks/useAppSettings';
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
  const { claudeEnabled, showClaudeUsage } = useAppSettings();
  const isSunset = useIsSunset();
  const hasAccounts = useClaudeUsage((s) => s.accounts.length > 0);
  // The usage footer never shows on the Settings page — it would sit over the
  // settings footer chrome — nor when the integration is switched off.
  const onSettings = useLocation().pathname.startsWith('/settings');
  const claudeActive = claudeEnabled && !onSettings;
  const footerVisible = showClaudeUsage && hasAccounts && claudeActive;

  // Mirror the Sunset flag AND the dark flag onto <html> so theme rules — and
  // Tailwind's `dark:` variants — also reach Blueprint popovers/menus, which
  // portal to document.body outside the App root. Without the dark mirror,
  // portaled popover text falls back to light-mode colours and vanishes on the
  // dark popover background.
  useEffect(() => {
    document.documentElement.classList.toggle('theme-sunset', isSunset);
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode, isSunset]);

  return (
    <div
      className={cn(
        'flex w-full relative flex-col',
        isSunset && 'theme-sunset devkitty-app-bg min-h-screen',
        footerVisible && 'has-claude-footer',
        darkMode && [Classes.DARK, 'dark']
      )}
    >
      <AppNavbar />
      <Routing />
      <Modal />
      {/* Kept mounted on the Settings route (it reads the route itself) so it
          slides down instead of vanishing. */}
      {claudeEnabled && <ClaudeFooter />}

      {isSunset && (
        <>
          {/* Inset shadow — recesses the content into the gradient frame for depth. */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-40 shadow-[inset_0_0_28px_1px_rgba(0,0,0,0.5)] dark:shadow-[inset_0_0_32px_2px_rgba(0,0,0,0.65)]"
          />

          {/* Gradient frame edges — connect the header band to the footer band. */}
          <div
            aria-hidden
            className="devkitty-edge-l pointer-events-none fixed bottom-0 left-0 top-0 z-50 w-0.5"
          />

          <div
            aria-hidden
            className="devkitty-edge-r pointer-events-none fixed bottom-0 right-0 top-0 z-50 w-0.5"
          />
        </>
      )}
    </div>
  );
};
