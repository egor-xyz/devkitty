import { Classes, Icon } from '@blueprintjs/core';
import { type FC, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useGroups } from 'rendered/hooks/useGroups';
import { useModal } from 'rendered/hooks/useModal';
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

  const isEmpty = !projects.length;

  if (group.id === 'ungrouped' && isEmpty) {
    return null;
  }

  // Calculate dynamic height for the group body
  const bodyHeight = projects.length * 40 + (projects.length - 1) * 2;

  return (
    <div
      className={`flex flex-col bg-blueprint-light-gray5 dark:bg-blueprint-dark-gray1 transition-opacity duration-300 ease-in-out ${isDragging ? 'opacity-30' : ''}`}
      data-handler-id={handlerId}
      key={group.id}
      ref={group.id === 'ungrouped' ? null : ref}
    >
      <div
        className="flex items-start justify-between w-full py-1 px-5 pl-5 text-sm font-light uppercase cursor-pointer select-none gap-x-2.5 dark:text-gray-400"
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

      <div
        className={`flex flex-col w-full py-1 overflow-hidden transition-all duration-300 ease-in-out ${
          collapsed 
            ? 'min-h-0 max-h-0 overflow-hidden' 
            : 'overflow-y-visible'
        }`}
        style={!collapsed ? { 
          maxHeight: '100%',
          minHeight: `${bodyHeight}px`
        } : {}}
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
