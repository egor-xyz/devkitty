import { Classes, ContextMenu, Icon, Menu, MenuDivider, MenuItem } from '@blueprintjs/core';
import { type FC, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useDarkModeStore } from 'renderer/hooks/useDarkMode';
import { useGroups } from 'renderer/hooks/useGroups';
import { useModal } from 'renderer/hooks/useModal';
import { cn } from 'renderer/utils/cn';
import { type Group } from 'types/Group';
import { type Projects } from 'types/project';

import { Project } from '../Project';

const GROUP = 'group';

type Props = {
  collapsed: boolean;
  group: Group;
  index: number;
  onClick: () => void;
  projects: Projects;
};

export const GroupCollapse: FC<Props> = ({ collapsed, group, index, onClick, projects }) => {
  const { openModal } = useModal();
  const { changeOrder } = useGroups();
  const { darkMode } = useDarkModeStore();

  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop({
    accept: GROUP,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId()
      };
    },
    hover(item: { id: string; index: number }, monitor) {
      if (!ref.current) return;

      if (item.id === 'ungrouped') return;

      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;

      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      changeOrder(dragIndex, hoverIndex);

      item.index = hoverIndex;
    }
  });

  const [{ isDragging }, drag] = useDrag({
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    item: () => ({ id: group.id, index }),
    type: GROUP
  });

  drop(ref);

  const removeGroup = () => {
    openModal({
      name: 'remove:group',
      props: { group }
    });
  };

  const renameGroup = () => {
    openModal({
      name: 'group',
      props: { group }
    });
  };

  const createGroup = () => {
    openModal({
      name: 'group',
      props: {}
    });
  };

  const isEmpty = !projects.length;

  const isUngrouped = group.id === 'ungrouped';

  const menuContent = (
    <Menu className={darkMode ? Classes.DARK : undefined}>
      <MenuItem
        icon="add"
        onClick={createGroup}
        text="New group"
      />

      {!isUngrouped && (
        <>
          <MenuItem
            icon="edit"
            onClick={renameGroup}
            text="Rename"
          />

          <MenuDivider title="Danger zone" />

          <MenuItem
            icon="trash"
            intent="danger"
            onClick={removeGroup}
            text="Remove"
          />
        </>
      )}
    </Menu>
  );

  if (group.id === 'ungrouped' && isEmpty) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-col bg-bp-light-gray-5 dark:bg-bp-dark-gray-1 transition-opacity duration-300 ease-in-out',
        isDragging && 'opacity-30'
      )}
      data-handler-id={handlerId}
      key={group.id}
      ref={group.id === 'ungrouped' ? null : ref}
    >
      <ContextMenu content={menuContent}>
        <div
          className={cn(
            'flex items-start justify-between w-full py-1 pl-5 pr-4',
            'text-sm font-light cursor-pointer select-none gap-x-2.5',
            'dark:text-bp-dark-gray-5'
          )}
          onClick={() => !isEmpty && onClick()}
          ref={drag}
        >
          <div className={Classes.ALIGN_LEFT}>
            <Icon icon={group.icon} />{' '}

            <span>
              {group.fullName} ({projects.length})
            </span>
          </div>

          <div className={Classes.ALIGN_RIGHT}>
            {isEmpty && (
              <Icon
                icon="trash"
                onClick={removeGroup}
                size={14}
              />
            )}

            {!isEmpty && (
              <Icon
                icon={collapsed ? 'minimize' : 'maximize'}
                intent={collapsed ? 'warning' : 'none'}
                size={14}
              />
            )}
          </div>
        </div>
      </ContextMenu>

      <div
        className={cn(
          'flex flex-col w-full max-h-full py-1 overflow-hidden overflow-y-visible transition-all duration-300 ease-in-out',
          collapsed && 'min-h-0 max-h-0 overflow-hidden'
        )}
        style={{ minHeight: collapsed ? 0 : `${projects.length * 40 + (projects.length - 1) * 2}px` }}
      >
        {!collapsed &&
          projects.map((project) => (
            <Project
              key={project.id}
              project={project}
            />
          ))}
      </div>
    </div>
  );
};
