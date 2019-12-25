import { FC, useMemo } from 'react';
import {
  Alignment,
  Button,
  Classes,
  Menu,
  MenuDivider,
  MenuItem,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
  Popover,
  Position,
  Tooltip,
} from '@blueprintjs/core';
import { Link, useHistory, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { is } from 'electron-util';

import { DevKittyLogo, JenkinsLogo } from 'assets/icons/svg';
import { addFolders, scanFolders } from 'utils';
import { GroupSelect } from 'components';
import { useAppStore, useAppStoreDispatch } from 'context';
import { useModalsStore } from 'modals';
import { TranslateButton, useJenkinsStore } from 'modules';

import css from './Header.module.scss';

const TOOLTIP_DELAY = 1000;

export const Header: FC = () => {
  const { pathname: path } = useLocation();
  const { push } = useHistory();
  const { openModal } = useModalsStore();
  const { isActive } = useJenkinsStore();

  const state = useAppStore();
  const dispatch = useAppStoreDispatch();

  const { snow, darkModeOS, showLogo, groupFilter, groupId, projects } = state;

  const addGitRepo = async () => {
    const res = await addFolders(state, dispatch);
    if (!res) return;
    push('/');
    scanFolders({ dispatch, state });
  };

  return useMemo(() => (
    <Navbar className={clsx(css.root, { [css.macOs]: is.macos })}>
      <NavbarGroup align={Alignment.LEFT}>
        <Popover
          content={(
            <Menu>
              <MenuItem
                icon={'git-repo'}
                text={'Add Git Projects'}
                onClick={addGitRepo}
              />
              {isActive && (<>
                <MenuDivider />
                <MenuItem
                  icon={(
                    <JenkinsLogo
                      className={css.icon}
                      height={16}
                    />
                  )}
                  text={'Add Jenkins Job'}
                  onClick={() => openModal({ name: 'jenkinsJob' })}
                />
              </>)}
            </Menu>
          )}
          position={Position.BOTTOM}
        >
          <Button
            className={Classes.MINIMAL}
            icon='plus'
          />
        </Popover>

        <NavbarDivider />

        <Link
          className={css.link}
          to='/'
        >
          <Button
            active={path === '/'}
            className={Classes.MINIMAL}
            icon='projects'
            text='Git'
          />
        </Link>

        {isActive && (
          <Link
            className={css.link}
            to='/jenkins'
          >
            <Button
              active={path === '/jenkins'}
              className={Classes.MINIMAL}
              icon='build'
              text='Jenkins'
            />
          </Link>
        )}

        <TranslateButton />
      </NavbarGroup>

      <NavbarGroup align={Alignment.RIGHT}>
        {path === '/' && (<>

          <Tooltip
            content={'Refresh all (not hidden) Git Projects'}
            hoverOpenDelay={TOOLTIP_DELAY}
          >
            <Button
              className={clsx(Classes.MINIMAL, css.mr)}
              icon={'refresh'}
              onClick={() => scanFolders({ dispatch, state })}
            />
          </Tooltip>

          {groupId === '0' && (
            <Button
              active={groupFilter}
              className={css.mr}
              icon={'sort'}
              minimal={true}
              title='Sort by Groups'
              onClick={() => dispatch({ payload: !groupFilter, type: 'setGroupFilter' })}
            />
          )}

          <GroupSelect />

          <NavbarDivider />
        </>)}

        {snow && (<>
          <Button
            active={snow}
            className={Classes.MINIMAL}
            icon='snowflake'
            intent={snow ? 'success' : 'none'}
            onClick={() => dispatch({ payload: 'snow', type: 'toggle' })}
          />
          <NavbarDivider />
        </>)}

        {!darkModeOS && (
          <Button
            className={clsx(Classes.MINIMAL, css.darkBtn)}
            icon='contrast'
            onClick={() => dispatch({ payload: 'darkMode', type: 'toggle' })}
          />
        )}

        <Link
          className={css.link}
          to='/config'
        >
          <Button
            active={path === '/config'}
            className={Classes.MINIMAL}
            icon='settings'
          />
        </Link>

        {showLogo && (<>
          <NavbarDivider />

          <NavbarHeading className={css.logoWrap}>
            <DevKittyLogo
              className={css.logo}
              onClick={() => dispatch({ type: 'toggleAbout' })}
            />
          </NavbarHeading>
        </>)}
      </NavbarGroup>
    </Navbar>
  ), [
    darkModeOS,
    dispatch,
    groupFilter,
    groupId,
    path,
    showLogo,
    snow,
    path,
    projects,
    isActive,
  ]);
};
