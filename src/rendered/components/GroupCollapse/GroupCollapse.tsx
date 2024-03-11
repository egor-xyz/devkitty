import { Classes, Icon } from '@blueprintjs/core';
import { useRef, type FC } from 'react';
import { useDrag, useDrop } from 'react-dnd';

import { Group } from 'types/Group';
import { Projects } from 'types/project';
import { useModal } from 'rendered/hooks/useModal';
import { useNewGroups } from 'rendered/hooks/useNewGroups';

import { Project } from '../Project';
import { GroupBody, GroupTitle, Root } from './GroupCollapse.styles';

const GROUP = 'group';

type Props = {
  collapsed: boolean;
  group: Group;
  index: number;
  onClick: () => void;
  projects: Projects;
};

export const GroupCollapse: FC<Props> = ({ group, collapsed, onClick, projects, index }) => {
  const { openModal } = useModal();
  const { changeOrder } = useNewGroups();

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

  return (
    <Root
      $isDragging={isDragging}
      data-handler-id={handlerId}
      key={group.id}
      ref={group.id === 'ungrouped' ? null : ref}
    >
      <GroupTitle
        ref={drag}
        onClick={() => !isEmpty && onClick()}
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
              size={14}
              onClick={removeGroup}
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
      </GroupTitle>
      <GroupBody
        $collapsed={collapsed}
        $length={projects.length}
      >
        {!collapsed &&
          projects.map((project) => (
            <Project
              key={project.id}
              project={project}
            />
          ))}
      </GroupBody>
    </Root>
  );
};
