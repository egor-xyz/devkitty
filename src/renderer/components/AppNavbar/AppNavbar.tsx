import { Button, ButtonGroup, Classes, Icon, Navbar, Tooltip } from '@blueprintjs/core';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import Devkitty from 'renderer/assets/devkitty.svg?react';
import { useAppSettings, useIsSunset } from 'renderer/hooks/useAppSettings';
import { useClaudeUsage } from 'renderer/hooks/useClaudeUsage';
import { useDarkMode } from 'renderer/hooks/useDarkMode';
import { useFilter } from 'renderer/hooks/useFilter';
import { useProjects } from 'renderer/hooks/useProjects';
import { cn } from 'renderer/utils/cn';

import { ClaudeMark } from '../ClaudeUsage';
import { ShinyText } from '../ShinyText';
import { SearchInput } from './SearchInput';

export const AppNavbar = () => {
  const { themeSource, toggleDarkMode } = useDarkMode();
  const { claudeEnabled, set, showClaudeUsage, showLogo } = useAppSettings();
  const isSunset = useIsSunset();
  const claudeInstalled = useClaudeUsage((s) => s.detection.installed);
  const { addProject } = useProjects();
  const { clear, query, setQuery } = useFilter();
  const searchRef = useRef<HTMLInputElement>(null);
  const onHome = useLocation().pathname === '/';
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);

  // Reflect the window's real pinned state on mount (it survives across
  // reloads within a session).
  useEffect(() => {
    window.bridge.window.getAlwaysOnTop().then(setAlwaysOnTop);
  }, []);

  const toggleAlwaysOnTop = async () => {
    const next = await window.bridge.window.setAlwaysOnTop(!alwaysOnTop);
    setAlwaysOnTop(next);
  };

  // Leaving the project list drops the filter, so coming back is never
  // silently narrowed by something typed a page ago.
  useEffect(() => {
    if (!onHome) clear();
  }, [clear, onHome]);

  // ⌘F jumps to the filter, Escape drops it — the shortcuts anything with a
  // search field is expected to answer to.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }

      if (event.key === 'Escape' && document.activeElement === searchRef.current) {
        clear();
        searchRef.current?.blur();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [clear]);

  const refresh = () => {
    window.location.reload();
  };

  return (
    <Navbar
      className={cn(
        'app-region-drag select-none !shadow-none overflow-hidden',
        isSunset
          ? 'devkitty-header-grad'
          : '!bg-bp-light-gray-4 dark:!bg-bp-dark-gray-1 dark:border-b dark:border-bp-dark-gray-2'
      )}
    >
      <Navbar.Group className="app-region-no-drag ml-[70px] overflow-hidden">
        <Button
          icon="plus"
          minimal
          onClick={addProject}
        />

        {!isSunset && (
          <div className="navbar-shadow-container hidden dark:block">
            <div className="navbar-shadow" />
          </div>
        )}

        <div
          className={cn(
            'app-region-drag ml-1.5 text-lg select-none pointer-events-none',
            isSunset ? 'dark:text-bp-light-gray-4' : 'dark:-ml-[42px] dark:text-bp-dark-gray-3'
          )}
        >
          <ShinyText text="devkitty" />
        </div>
      </Navbar.Group>

      <Navbar.Group
        align="right"
        className="app-region-no-drag ml-[70px] [&>button+button]:ml-2 [&>button+a]:ml-2"
      >
        {/* Nothing to filter anywhere but the project list. */}
        {onHome && (
          <div className="flex items-center self-center mr-2">
            <SearchInput
              inputRef={searchRef}
              onChange={setQuery}
              onClear={clear}
              value={query}
            />
          </div>
        )}

        <Button
          icon="refresh"
          minimal
          onClick={refresh}
        />

        <Tooltip
          compact
          content={alwaysOnTop ? 'Always on top: on' : 'Keep window always on top'}
          hoverOpenDelay={500}
          placement="bottom"
        >
          <Button
            active={alwaysOnTop}
            aria-label="Toggle always on top"
            icon="pin"
            minimal
            onClick={toggleAlwaysOnTop}
          />
        </Tooltip>

        <Navbar.Divider />

        <NavLink
          className={({ isActive }) => clsx(Classes.BUTTON, Classes.MINIMAL, isActive && Classes.ACTIVE)}
          to="/"
        >
          <Icon icon="home" />
        </NavLink>

        <Navbar.Divider />

        <ButtonGroup minimal>
          {themeSource !== 'system' && (
            <Button
              icon="contrast"
              onClick={toggleDarkMode}
            />
          )}

          {claudeInstalled && claudeEnabled && (
            <Tooltip
              compact
              content={showClaudeUsage ? 'Hide Claude Code usage' : 'Show Claude Code usage'}
              hoverOpenDelay={2000}
              placement="bottom"
            >
              <Button
                icon={<ClaudeMark className={showClaudeUsage ? 'text-[#D97757]' : undefined}
                  size={16}
                      />}
                minimal
                onClick={() => set({ showClaudeUsage: !showClaudeUsage })}
              />
            </Tooltip>
          )}

          <NavLink
            className={({ isActive }) => clsx(Classes.BUTTON, Classes.MINIMAL, isActive && Classes.ACTIVE)}
            to="/settings"
          >
            <Icon icon="settings" />
          </NavLink>
        </ButtonGroup>

        {showLogo && (
          <>
            <Navbar.Divider />
            <Devkitty className="h-7 devkitty-logo" />
          </>
        )}
      </Navbar.Group>
    </Navbar>
  );
};
