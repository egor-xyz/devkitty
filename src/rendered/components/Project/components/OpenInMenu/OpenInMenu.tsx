import { IconName, MaybeElement, Menu, MenuDivider, MenuItem } from '@blueprintjs/core';
import { FC } from 'react';
import { FaGithub } from 'react-icons/fa';

import { useAppSettings } from 'rendered/hooks/useAppSettings';
import { GitStatus, Project } from 'types/project';
import { ActionsIcon } from 'rendered/assets/icons';

import VSCode from '../../assets/VSCode.svg?react';
import Warp from '../../assets/Warp.svg?react';
import { Title } from './OpenInMenu.styles';

type Props = {
  gitStatus: GitStatus;
  project: Project;
};

export const OpenInMenu: FC<Props> = ({ project, gitStatus }) => {
  const { selectedEditor, selectedShell } = useAppSettings();

  const openInEditor = () => {
    window.bridge.launch.editor(project.filePath, selectedEditor);
  };

  const openInShell = () => {
    window.bridge.launch.shell(project.filePath, selectedShell);
  };

  const shellIcon: IconName | MaybeElement = selectedShell?.shell === 'Warp' ? <Warp height={15} /> : 'console';
  const editorIcon: IconName | MaybeElement =
    selectedEditor?.editor === 'Visual Studio Code' ? <VSCode height={15} /> : 'code';

  const openInGitHub = (path: string = '') => {
    console.log('openInGitHub', path);
    window.open(`https://github.com/${gitStatus.organization}/${project.name}${path}`, '_blank');
  };

  return (
    <Menu>
      <MenuDivider title="Local" />

      {selectedShell && (
        <MenuItem
          icon={shellIcon}
          text={`Open in ${selectedShell?.shell}`}
          onClick={openInShell}
        />
      )}

      {selectedEditor && (
        <MenuItem
          icon={editorIcon}
          text={`Open in ${selectedEditor?.editor}`}
          onClick={openInEditor}
        />
      )}

      <MenuDivider
        title={
          <Title>
            <FaGithub size={18} /> GitHub
          </Title>
        }
      />
      <MenuItem
        icon={'code'}
        text={`Project`}
        onClick={() => openInGitHub('/')}
      />
      <MenuItem
        icon={<ActionsIcon />}
        text={`Actions`}
        onClick={() => openInGitHub('/actions')}
      />
      <MenuItem
        icon={'git-pull'}
        text={`Pull requests`}
        onClick={() => openInGitHub('/pulls')}
      />
    </Menu>
  );
};
