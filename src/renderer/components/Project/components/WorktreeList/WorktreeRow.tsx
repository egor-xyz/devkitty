import { Button, ButtonGroup, Icon, Tooltip } from '@blueprintjs/core';
import { type FC, useEffect, useState } from 'react';
import { GitStatusBadge } from 'renderer/components/GitStatusBadge';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { useModal } from 'renderer/hooks/useModal';
import { cn } from 'renderer/utils/cn';
import { type Worktree } from 'types/worktree';

type Props = {
  id: string;
  onSuccess?: () => void;
  worktree: Worktree;
};

type WorktreeStatus = {
  ahead: number;
  behind: number;
  modified: string[];
};

export const WorktreeRow: FC<Props> = ({ id, onSuccess, worktree }) => {
  const { openModal } = useModal();
  const { selectedEditor, selectedShell } = useAppSettings();
  const [deleting, setDeleting] = useState(false);
  const [wtStatus, setWtStatus] = useState<null | WorktreeStatus>(null);

  const abbreviated = worktree.path.replace(/^.*\//, '.../');

  useEffect(() => {
    const fetchStatus = async () => {
      const res = await window.bridge.worktree.getStatus(worktree.path);
      if (res.success && res.status) {
        setWtStatus({
          ahead: res.status.ahead,
          behind: res.status.behind,
          modified: res.status.modified
        });
      }
    };
    fetchStatus();
  }, [worktree.path]);

  const handleDelete = () => {
    openModal({
      name: 'git:worktree:remove',
      props: {
        branch: worktree.branch,
        id,
        onSuccess: async () => {
          setDeleting(true);
          onSuccess?.();
        },
        worktreePath: worktree.path
      }
    });
  };

  return (
    <div
      className={cn(
        'flex relative items-center justify-between min-h-[45px] py-1 pl-5 pr-4 gap-2 w-full box-border shrink-0 mt-0.5',
        'bg-bp-light-gray-4 dark:bg-bp-dark-gray-2',
        deleting && 'opacity-50 pointer-events-none'
      )}
    >
      <div className="overflow-hidden flex text-left justify-start gap-4 items-center flex-1 min-w-0">
        <div className="w-[30px] shrink-0 flex justify-center">
          {deleting ? (
            <Icon className="animate-spin"
              icon="refresh"
            />
          ) : (
            <Icon icon="diagram-tree" />
          )}
        </div>

        <div className="overflow-hidden flex flex-col">
          <div className="overflow-hidden text-ellipsis whitespace-nowrap">
            <b>{worktree.branch}</b>
          </div>

          <Tooltip content={worktree.path}>
            <div className="overflow-hidden whitespace-nowrap text-ellipsis -mt-0.5 text-[11px] font-light dark:text-bp-gray-3">
              {abbreviated}
            </div>
          </Tooltip>
        </div>

        {wtStatus && (
          <div className="flex select-none">
            <GitStatusBadge
              count={wtStatus.modified.length}
              icon="document"
              intent="danger"
              show={Boolean(wtStatus.modified.length)}
              tooltip={
                <>
                  <b>{worktree.branch}</b> has <b>{wtStatus.modified.length}</b> uncommited changed file{wtStatus.modified.length > 1 ? 's' : ''}
                </>
              }
            />

            <GitStatusBadge
              count={wtStatus.ahead}
              icon="arrow-up"
              intent="warning"
              show={Boolean(wtStatus.ahead)}
              tooltip={
                <>
                  <b>{worktree.branch}</b> has <b>{wtStatus.ahead}</b> ahead commit{wtStatus.ahead > 1 ? 's' : ''}
                </>
              }
            />

            <GitStatusBadge
              count={wtStatus.behind}
              icon="arrow-down"
              intent="primary"
              show={Boolean(wtStatus.behind)}
              tooltip={
                <>
                  <b>{worktree.branch}</b> has <b>{wtStatus.behind}</b> behind commit{wtStatus.behind > 1 ? 's' : ''}
                </>
              }
            />
          </div>
        )}
      </div>

      <ButtonGroup>
        {selectedEditor && (
          <Tooltip compact
            content={selectedEditor.editor}
            hoverOpenDelay={500}
            placement="bottom"
            popoverClassName="whitespace-nowrap"
          >
            <Button
              disabled={deleting}
              icon="code"
              onClick={() => window.bridge.launch.editor(worktree.path, selectedEditor)}
            />
          </Tooltip>
        )}

        {selectedShell && (
          <Tooltip compact
            content={selectedShell.shell}
            hoverOpenDelay={500}
            placement="bottom"
            popoverClassName="whitespace-nowrap"
          >
            <Button
              disabled={deleting}
              icon="console"
              onClick={() => window.bridge.launch.shell(worktree.path, selectedShell)}
            />
          </Tooltip>
        )}

        <Tooltip compact
          content="Remove worktree"
          hoverOpenDelay={500}
          placement="bottom"
        >
          <Button
            disabled={deleting}
            icon="trash"
            loading={deleting}
            onClick={handleDelete}
          />
        </Tooltip>
      </ButtonGroup>
    </div>
  );
};
