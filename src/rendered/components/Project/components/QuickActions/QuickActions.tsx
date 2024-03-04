import { Button, ButtonGroup, Classes, IconName, MaybeElement } from '@blueprintjs/core';
import { FC, useState } from 'react';
import { FaRegCopy, FaCopy } from 'react-icons/fa';

import { useAppSettings } from 'rendered/hooks/useAppSettings';
import { GitStatus, Project } from 'types/project';
import { useModal } from 'rendered/hooks/useModal';

import VSCode from '../../assets/VSCode.svg?react';
import Warp from '../../assets/Warp.svg?react';

type Props = {
  gitStatus: GitStatus;
  loading?: boolean;
  project: Project;
};

export const QuickActions: FC<Props> = ({ project, gitStatus, loading }) => {
  const [copyIcon, setCopyIcon] = useState<JSX.Element>(<FaRegCopy />);
  const { selectedEditor, selectedShell } = useAppSettings();
  const { openModal } = useModal();

  const copyToClipboard = () => {
    setCopyIcon(<FaCopy />);
    setTimeout(() => setCopyIcon(<FaRegCopy />), 1000);

    navigator.clipboard.writeText(gitStatus?.branchSummary?.current);
  };

  const openInEditor = () => {
    window.bridge.launch.editor(project.filePath, selectedEditor);
  };

  const openInShell = () => {
    window.bridge.launch.shell(project.filePath, selectedShell);
  };

  const openMerge = () => {
    openModal({ name: 'git:merge', props: { gitStatus, id: project.id, name: project.name } });
  };

  const shellIcon: IconName | MaybeElement = selectedShell?.shell === 'Warp' ? <Warp height={15} /> : 'console';
  const editorIcon: IconName | MaybeElement =
    selectedEditor?.editor === 'Visual Studio Code' ? <VSCode height={15} /> : 'code';

  return (
    <ButtonGroup className={!gitStatus && Classes.SKELETON}>
      <Button
        icon={copyIcon}
        title={'Copy the branch name to clipboard'}
        onClick={copyToClipboard}
      />

      <Button
        icon={'open-application'}
        title="Open in ..."
      />

      {selectedShell && (
        <Button
          icon={shellIcon}
          title={`Open in ${selectedShell?.shell}`}
          onClick={openInShell}
        />
      )}

      {selectedEditor && (
        <Button
          icon={editorIcon}
          title={`Open in ${selectedEditor?.editor}`}
          onClick={openInEditor}
        />
      )}

      <Button
        icon={'git-merge'}
        loading={loading}
        title="Merge to"
        onClick={openMerge}
      />
    </ButtonGroup>
  );
};
