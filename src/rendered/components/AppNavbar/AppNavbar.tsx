import { Button, ButtonGroup, Classes, Icon, Navbar } from '@blueprintjs/core';
import clsx from 'clsx';
import { NavLink } from 'react-router-dom';

import { useAppSettings } from 'rendered/hooks/useAppSettings';
import { useDarkMode } from 'rendered/hooks/useDarkMode';
import { useProjects } from 'rendered/hooks/useProjects';

import { LeftGroup, Logo, RightGroup, StyledNavbar, Shadow, ShadowContainer, Title } from './AppNavbar.styles';

export const AppNavbar = () => {
  const { themeSource, toggleDarkMode } = useDarkMode();
  const { showLogo } = useAppSettings();
  const { addProject } = useProjects();

  const refresh = () => {
    window.location.reload();
  };

  return (
    <StyledNavbar>
      <LeftGroup>
        <Button
          minimal
          icon="plus"
          onClick={addProject}
        />

        <ShadowContainer>
          <Shadow />
        </ShadowContainer>

        <Title>Devkitty</Title>
      </LeftGroup>

      <RightGroup align="right">
        <Button
          minimal
          icon="refresh"
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
            <Logo />
          </>
        )}
      </RightGroup>
    </StyledNavbar>
  );
};
