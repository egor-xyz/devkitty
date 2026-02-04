import { Button, ButtonGroup, Classes, Icon, Navbar } from '@blueprintjs/core';
import clsx from 'clsx';
import { NavLink } from 'react-router';
import Devkitty from 'rendered/assets/devkitty.svg?react';
import { useAppSettings } from 'rendered/hooks/useAppSettings';
import { useDarkMode } from 'rendered/hooks/useDarkMode';
import { useModal } from 'rendered/hooks/useModal';
import { useProjects } from 'rendered/hooks/useProjects';
import { cn } from 'rendered/utils/cn';

import { ShinyText } from '../ShinyText';

export const AppNavbar = () => {
  const { themeSource, toggleDarkMode } = useDarkMode();
  const { showLogo } = useAppSettings();
  const { addProject } = useProjects();
  const { openModal } = useModal();

  const addSticker = () => {
    openModal({
      name: 'sticker:add',
      props: {}
    });
  };

  const refresh = () => {
    window.location.reload();
  };

  return (
    <Navbar
      className={cn(
        'app-region-drag select-none !shadow-none overflow-hidden',
        '!bg-bp-light-gray-4 dark:!bg-bp-dark-gray-1 dark:border-b dark:border-bp-dark-gray-2'
      )}
    >
      <Navbar.Group className="app-region-no-drag ml-[70px] overflow-hidden">
        <Button
          icon="plus"
          minimal
          onClick={addProject}
        />

        <div className="navbar-shadow-container hidden dark:block">
          <div className="navbar-shadow" />
        </div>

        <div
          className={cn(
            'app-region-drag ml-1.5 text-lg select-none pointer-events-none',
            'dark:-ml-[42px] dark:text-bp-dark-gray-3'
          )}
        >
          <ShinyText text="devkitty" />
        </div>
      </Navbar.Group>

      <Navbar.Group
        align="right"
        className="app-region-no-drag ml-[70px] [&>button+button]:ml-2 [&>button+a]:ml-2"
      >
        <Button
          icon="refresh"
          minimal
          onClick={refresh}
        />

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

          <Button
            icon="pin"
            minimal
            onClick={addSticker}
          />

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
