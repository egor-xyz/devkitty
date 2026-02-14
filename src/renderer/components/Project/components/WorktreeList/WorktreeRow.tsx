import { Button, Icon, Tooltip } from '@blueprintjs/core';
import { type FC } from 'react';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { useModal } from 'renderer/hooks/useModal';
import { cn } from 'renderer/utils/cn';
import { type Worktree } from 'types/worktree';

type Props = {
  id: string;
  onSuccess?: () => void;
  worktree: Worktree;
};

export const WorktreeRow: FC<Props> = ({ id, onSuccess, worktree }) => {
  const { openModal } = useModal();
  const { selectedEditor, selectedShell } = useAppSettings();

  const abbreviated = worktree.path.replace(/^.*\//, '.../');

  return (
    <div
      className={cn(
        'flex relative items-center justify-between min-h-5 py-1.5 pl-5 pr-4 gap-2 w-full box-border shrink-0 my-0.5',
        'bg-bp-light-gray-4 dark:bg-bp-dark-gray-2'
      )}
    >
      <div className="overflow-hidden flex text-left justify-start gap-4 items-center flex-1 min-w-0">
        <Icon
          className="shrink-0"
          icon="diagram-tree"
        />

        <div className="overflow-hidden text-[13px] flex flex-col">
          <div className="overflow-hidden text-ellipsis whitespace-nowrap">
            <b>{worktree.branch}</b>
          </div>

          <Tooltip content={worktree.path}>
            <div className="overflow-hidden whitespace-nowrap text-ellipsis -mt-0.5 text-[11px] font-light dark:text-bp-gray-3">
              {abbreviated}
            </div>
          </Tooltip>
        </div>
      </div>

      <div className="flex gap-1 items-center shrink-0">
        {selectedEditor && (
          <Button
            icon="code"
            minimal
            onClick={() => window.bridge.launch.editor(worktree.path, selectedEditor)}
            small
            title="Open in editor"
          />
        )}

        {selectedShell && (
          <Button
            icon="console"
            minimal
            onClick={() => window.bridge.launch.shell(worktree.path, selectedShell)}
            small
            title="Open in terminal"
          />
        )}

        <Button
          icon="trash"
          intent="danger"
          minimal
          onClick={() => openModal({ name: 'git:worktree:remove', props: { branch: worktree.branch, id, onSuccess, worktreePath: worktree.path } })}
          small
          title="Remove worktree"
        />
      </div>
    </div>
  );
};
