import { IconName, MaybeElement, Menu, MenuItem } from '@blueprintjs/core';
import { FC } from 'react';

import { useAppSettings } from 'rendered/hooks/useAppSettings';
import { Project } from 'types/project';

import VSCode from '../../assets/VSCode.svg?react';
import Warp from '../../assets/Warp.svg?react';

type Props = {
  project: Project;
};

export const OpenInMenu: FC<Props> = ({ project }) => {
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

  return (
    <Menu>
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
    </Menu>
  );
};
