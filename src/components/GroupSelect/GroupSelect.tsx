import { FC, useMemo, useState } from 'react';
import { Button, MenuItem } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import clsx from 'clsx';
import { find } from 'lodash';
import { v4 } from 'uuid';

import { defGroupsIds, defGroupsNames, Group, Groups } from 'models';
import { useAppStore, useAppStoreDispatch } from 'context';

import css from './GroupSelect.module.scss';

interface Props {
  className?: string;
}

export const GroupSelect:FC<Props> = ({ className }) => {
  const state = useAppStore();
  const dispatch = useAppStoreDispatch();

  const [del, setDel] = useState(false);
  const [query, setQuery] = useState('');

  const { groups, groupId, projectsSettings } = state;

  const deleteGroup = (group: Group) => {
    if (defGroupsIds.includes(group.id)) return;

    // Change to default group
    if (groupId === group.id) {
      dispatch({
        payload: defGroupsIds[0],
        type: 'setGroupId'
      });
    }

    dispatch({
      payload: [...groups
        .filter(g => !defGroupsIds.includes(g.id))
        .filter(g => g.id !== group.id)
      ],
      type: 'setGroups'
    });

    const newProjectsSettings = { ...projectsSettings };
    Object.values(newProjectsSettings).forEach(({ repo, groupId }) => {
      if (groupId === group.id) {
        newProjectsSettings[repo].groupId = undefined;
      }
    });

    dispatch({
      payload: newProjectsSettings,
      type: 'setProjectsSettings'
    });

    return;
  };

  const onChange = (group: Group, event?: MouseEvent) => {
    // delete group
    if (event?.altKey) {
      deleteGroup(group);
      return;
    }

    dispatch({ payload: group.id, type: 'setGroupId' });
  };

  const addGroup = () => {
    if (defGroupsNames.includes(query.toLowerCase().trim())) return;
    dispatch({
      payload: {
        icon: 'bookmark',
        id: v4(),
        name: query
      },
      type: 'addGroup'
    });
  };

  const allGroups: Groups = [
    ...groups
  ];

  const filtered = allGroups.filter(({ name }) => !query || name.toLowerCase().includes(query.toLowerCase()));
  const group = find(groups, { id: groupId }) ?? find(groups, { id: '0' });

  return useMemo(() => {
    if (!group) return null;
    return (
      <div
        onKeyDown={event => {
          event.altKey && setDel(true);
        }}
        onKeyUp={() => del && setDel(false)}
      >
        <Select
          className={clsx(css.root, className)}
          createNewItemFromQuery={(query: any) => query}
          createNewItemRenderer={query => {
            if (defGroupsNames.includes(query.toLowerCase().trim())) return;
            return (
              <MenuItem
                icon='plus'
                text={query}
                onClick={addGroup}
              />
            );
          }}
          inputProps={{
            placeholder: 'Find / Create new'
          }}
          itemRenderer={(groupItem, { handleClick, index, modifiers: { disabled, active } }) => (
            <MenuItem
              active={groupItem.id === group.id}
              disabled={disabled}
              icon={(del && !defGroupsIds.includes(groupItem.id))
                ? 'trash'
                : groupItem.icon ?? 'bookmark'
              }
              intent={(del && !defGroupsIds.includes(groupItem.id)) ? 'danger' : 'none'}
              key={index}
              text={groupItem.name}
              onClick={handleClick}
            />
          )}
          items={filtered}
          popoverProps={{
            portalClassName: clsx(css.menu, { [css.helpHidden]: del })
          }}
          resetOnClose={true}
          onItemSelect={(group, event: any) => onChange(group, event)}
          onQueryChange={setQuery}
        >
          <Button
            active={group.id !== '0'}
            icon={group.icon ?? 'bookmark'}
            minimal={true}
            title={`${group.name} (CMD + G)`}
          />
        </Select>
      </div>
    );
  }, [del, query, group, groups, groupId, projectsSettings, filtered, allGroups]); // eslint-disable-line
};
