import { type IconName, type MaybeElement, Menu, MenuDivider, MenuItem } from '@blueprintjs/core';
import { type FC } from 'react';
import { FaGithub } from 'react-icons/fa';
import { ActionsIcon } from 'renderer/assets/gitHubIcons';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { type GitStatus, type Project } from 'types/project';

import VSCode from '../../assets/VSCode.svg?react';
import Warp from '../../assets/Warp.svg?react';

type Props = {
  gitStatus: GitStatus;
  project: Project;
};

export const OpenInMenu: FC<Props> = ({ gitStatus, project }) => {
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

  const openInGitHub = (path = '') => {
    window.open(`https://github.com/${gitStatus.organization}/${project.name}${path}`, '_blank');
  };

  return (
    <Menu>
      <MenuDivider title="Local" />

      {selectedShell && (
        <MenuItem
          icon={shellIcon}
          onClick={openInShell}
          text={`Open in ${selectedShell?.shell}`}
        />
      )}

      {selectedEditor && (
        <MenuItem
          icon={editorIcon}
          onClick={openInEditor}
          text={`Open in ${selectedEditor?.editor}`}
        />
      )}

      <MenuDivider
        title={
          <div className="flex items-center gap-2">
            <FaGithub size={18} /> GitHub
          </div>
        }
      />

      <MenuItem
        icon={'code'}
        onClick={() => openInGitHub('/')}
        text={`Project`}
      />

      <MenuItem
        icon={<ActionsIcon />}
        onClick={() => openInGitHub('/actions')}
        text={`Actions`}
      />

      <MenuItem
        icon={'git-pull'}
        onClick={() => openInGitHub('/pulls')}
        text={`Pull requests`}
      />
    </Menu>
  );
};
