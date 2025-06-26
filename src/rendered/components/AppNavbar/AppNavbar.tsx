import { Button, ButtonGroup, Classes, Icon, Navbar } from '@blueprintjs/core';
import clsx from 'clsx';
import { NavLink } from 'react-router';
import { useAppSettings } from 'rendered/hooks/useAppSettings';
import { useDarkMode } from 'rendered/hooks/useDarkMode';
import { useModal } from 'rendered/hooks/useModal';
import { useProjects } from 'rendered/hooks/useProjects';

import { ShinyText } from '../ShinyText';
import { LeftGroup, Logo, RightGroup, Shadow, ShadowContainer, StyledNavbar, Title } from './AppNavbar.styles';

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
          icon="plus"
          minimal
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
            <Logo />
          </>
        )}
      </RightGroup>
    </StyledNavbar>
  );
};
