import { Button, ButtonGroup, Classes, Icon, Navbar } from '@blueprintjs/core';
import clsx from 'clsx';
import { NavLink } from 'react-router';

import { useAppSettings } from 'rendered/hooks/useAppSettings';
import { useDarkMode } from 'rendered/hooks/useDarkMode';
import { useProjects } from 'rendered/hooks/useProjects';

import { LeftGroup, Logo, RightGroup, StyledNavbar, Shadow, ShadowContainer, Title } from './AppNavbar.styles';
import { useModal } from 'rendered/hooks/useModal';
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

        <Title>
          <ShinyText text="devkitty" />
        </Title>
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

          <Button
            minimal
            icon="pin"
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
            <Logo />
          </>
        )}
      </RightGroup>
    </StyledNavbar>
  );
};
