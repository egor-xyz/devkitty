import { FC } from 'react';
import { Button, Card, Colors, Icon } from '@blueprintjs/core';
import { AnimatePresence, motion } from 'framer-motion';
import { find } from 'lodash';
import clsx from 'clsx';

import { useAppStore, useAppStoreDispatch } from 'context';
import { Project } from 'models';
import { scanFolders } from 'utils';

import css from './GroupTitle.module.scss';

const MotionDiv = motion.div;

const groupTitleAnimFrom = {
  maxHeight: 0,
  opacity: 0,
  y: '-30px'
};
const groupTitleAnimTo = {
  maxHeight: 30,
  opacity: 1,
  y: 0
};

interface Props {
  className?: string;
  groupName?: string;
  id: string;
  isOpen: boolean;
  showNotification?: boolean;
  sortedGroupsProjects?: Project[][];
}

export const GroupTitle: FC<Props> = ({
  groupName, showNotification, sortedGroupsProjects = [0, 1], id, className, isOpen
}) => {
  const state = useAppStore();
  const dispatch = useAppStoreDispatch();

  const { groupFilter, groupId, groups, collapsedGroups } = state;

  if (!groupFilter && groupId === '0') return null;

  let name = groupName;
  if (id === '0') {
    name = 'Other repositories';
  }
  if (id === 'errors') {
    name = 'Errors';
  }
  if (!name) {
    name = find(groups, { id })?.name ?? '';
  }

  return (
    <AnimatePresence>
      <MotionDiv
        layout
        animate={groupTitleAnimTo}
        className={clsx(className)}
        exit={groupTitleAnimFrom}
        initial={groupTitleAnimFrom}
      >
        <Card
          className={css.card}
          onClick={() => {
            if (groupId !== '0' || sortedGroupsProjects.length < 2) return;
            dispatch({ payload: id, type: 'toggleCollapsedGroup' });
          }}
        >
          <div className={css.name}>
            <span>{groupName ?? name}</span>
            {showNotification && sortedGroupsProjects.length > 1 && (
              <Icon
                className={css.notificationIcon}
                icon={'dot'}
                intent={'danger'}
              />
            )}
          </div>

          {/* If group id is not All - hide */}
          {groupId === '0' && sortedGroupsProjects.length > 1 && (<div className={css.actions}>
            {isOpen && (
              <Button
                icon={'refresh'}
                minimal={true}
                onClick={(e: any) => {
                  e.stopPropagation();
                  scanFolders({ dispatch, groupId: id, state });
                }}
              />
            )}
            <Icon
              className={css.collapseIcon}
              color={Colors.GRAY1}
              icon={!collapsedGroups.has(id!) ? 'chevron-down' : 'chevron-right'}
            />
          </div>)}
        </Card>
      </MotionDiv>
    </AnimatePresence>
  );
};