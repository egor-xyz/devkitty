import { type IconName, type MaybeElement, Menu, MenuDivider, MenuItem } from '@blueprintjs/core';
import { type FC } from 'react';
import { FaGithub } from 'react-icons/fa';
import { ActionsIcon } from 'renderer/assets/gitHubIcons';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { useModal } from 'renderer/hooks/useModal';
import { type GitStatus } from 'types/project';

import VSCode from '../../assets/VSCode.svg?react';
import Warp from '../../assets/Warp.svg?react';
import { GroupsSelect } from '../GroupsSelect';

type Props = {
  clearHiddenRuns: () => void;
  filePath: string;
  getStatus: () => void;
  gitStatus: GitStatus;
  groupId?: string;
  hiddenCount: number;
  id: string;
  name: string;
  pull: () => void;
  removeProject: () => void;
};

export const ProjectMenu: FC<Props> = ({ clearHiddenRuns, filePath, getStatus, gitStatus, groupId, hiddenCount, id, name, pull, removeProject }) => {
  const { openModal } = useModal();
  const { selectedEditor, selectedShell } = useAppSettings();

  const shellIcon: IconName | MaybeElement = selectedShell?.shell === 'Warp' ? <Warp height={15} /> : 'console';
  const editorIcon: IconName | MaybeElement =
    selectedEditor?.editor === 'Visual Studio Code' ? <VSCode height={15} /> : 'code';

  const openInGitHub = (path = '') => {
    window.open(`https://github.com/${gitStatus?.organization}/${name}${path}`, '_blank');
  };

  return (
    <Menu>
      <MenuItem
        icon="refresh"
        onClick={getStatus}
        text="Refresh"
      />

      <MenuItem
        icon="git-pull"
        onClick={pull}
        text="Pull"
      />

      <MenuItem
        icon="git-merge"
        onClick={() => openModal({ name: 'git:merge', props: { gitStatus, id, name } })}
        text="Merge"
      />

      <MenuItem
        icon="reset"
        intent="warning"
        onClick={() => openModal({ name: 'git:reset', props: { gitStatus, id, name } })}
        text="Reset branch"
      />

      <MenuItem
        icon="git-new-branch"
        onClick={() => openModal({ name: 'git:worktree:add', props: { gitStatus, id, name, onSuccess: getStatus } })}
        text="Add worktree"
      />

      <MenuItem
        disabled={hiddenCount === 0}
        icon="eye-open"
        onClick={clearHiddenRuns}
        text={hiddenCount > 0 ? `Unhide actions (${hiddenCount})` : 'Unhide actions'}
      />

      <MenuDivider />

      <MenuItem
        icon="share"
        text="Open in"
      >
        {selectedShell && (
          <MenuItem
            icon={shellIcon}
            onClick={() => window.bridge.launch.shell(filePath, selectedShell)}
            text={selectedShell.shell}
          />
        )}

        {selectedEditor && (
          <MenuItem
            icon={editorIcon}
            onClick={() => window.bridge.launch.editor(filePath, selectedEditor)}
            text={selectedEditor.editor}
          />
        )}

        <MenuDivider
          title={
            <div className="flex items-center gap-2">
              <FaGithub size={14} /> GitHub
            </div>
          }
        />

        <MenuItem
          icon="code"
          onClick={() => openInGitHub('/')}
          text="Project"
        />

        <MenuItem
          icon={<ActionsIcon />}
          onClick={() => openInGitHub('/actions')}
          text="Actions"
        />

        <MenuItem
          icon="git-pull"
          onClick={() => openInGitHub('/pulls')}
          text="Pull requests"
        />
      </MenuItem>

      <GroupsSelect
        groupId={groupId}
        id={id}
      />

      <MenuDivider title="Danger zone" />

      <MenuItem
        icon="trash"
        intent="danger"
        onClick={removeProject}
        text="Remove"
      />
    </Menu>
  );
};
