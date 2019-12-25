import { FC, useState } from 'react';
import { Button } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import { api } from 'electron-util';
import find from 'lodash/find';
import clsx from 'clsx';

import { Project } from 'models';
import { useAppStore, useAppStoreDispatch } from 'context';
import { createNewBranch, getBranchesObj, getBranchNames } from 'utils';
import { BRANCHES_LIMIT } from 'components/ProjectCard';
import { Branches } from 'models/Branch';
import { ModalsStore, useModalsStore } from 'modals/context';

import { highlightText } from './utils';
import { Root, StyledMenuItem } from './BranchSelect.styles';
import css from './BranchSelect.module.scss';

interface Props {
  className?: string;
  defaultValue?: string;
  disabled?: boolean;
  mode?: 'default' | 'readonly';
  onChange: (item: string) => void;
  project: Project;
  value: string | undefined;
}

type OnItemSelect = (data: {
  event?: MouseEvent;
  item: string;
  onChange: (item: string) => void;
  openModal: ModalsStore['openModal'];
  project: Project;
}) => void;
const onItemSelect: OnItemSelect = ({ openModal, project, event, item, onChange }) => {
  // copy
  if (event?.metaKey) {
    api.clipboard.writeText(item);
    return;
  }
  // delete
  if (event?.altKey) {
    const branch = getBranchesObj(project.branches)[item];
    if (!branch.local) return;
    openModal({
      data: { name: item, project },
      name: 'deleteBranch'
    });
    return;
  }
  if (!find(project.branches, { name: item })) return;
  onChange(item);
};

export const BranchSelect: FC<Props> = ({
  disabled,
  project,
  onChange,
  value,
  defaultValue,
  className,
  mode = 'default'
}) => {
  const state = useAppStore();
  const dispatch = useAppStoreDispatch();

  const { openModal } = useModalsStore();
  const { loading } = state;
  const [query, setQuery] = useState('');
  const [clipBoard, setClipBoard] = useState(false);
  const [del, setDel] = useState(false);
  const { repo, branches } = project;

  const filteredBranches: Branches = branches
    .filter(branch => !query || branch.name.includes(query))
    .slice(0, BRANCHES_LIMIT)
  ;

  const LIMIT = filteredBranches.length < BRANCHES_LIMIT ? filteredBranches.length - 1 : BRANCHES_LIMIT - 1;

  const branchesObj = getBranchesObj(branches);

  return (
    <Root
      className={clsx({ 'bp3-skeleton': loading[repo] }, className)}
      onKeyDown={event => {
        if (mode === 'readonly') return;
        event.metaKey && setClipBoard(true);
        event.altKey && setDel(true);
      }}
      onKeyUp={() => {
        if (mode === 'readonly') return;
        setClipBoard(false);
        setDel(false);
      }}
    >
      <Select
        createNewItemFromQuery={q => q}
        createNewItemRenderer={query => {
          if (mode === 'readonly') return undefined;
          return (
            <StyledMenuItem
              icon='git-new-branch'
              tagName={'div'}
              text='New Branch'
              onClick={() => {
                setClipBoard(false);
                setDel(false);
                createNewBranch(project, query, state, dispatch);
              }}
            />
          );
        }}
        disabled={disabled}
        inputProps={{
          placeholder: mode === 'default'
            ? 'Find / Create new branch'
            : 'Find...'
        }}
        itemRenderer={(item, { index, modifiers: { active, disabled, matchesPredicate }, handleClick }) => {
          if (!matchesPredicate) return null;
          return (
            <StyledMenuItem
              active={active}
              className={clsx({
                'help': index === LIMIT,
                'helpHidden': (index === LIMIT) && (clipBoard || del),
                'infoFirst': index === 0,
                'infoFirstHidden': index === 0 && (clipBoard || del),
                'readonly': mode === 'readonly'
              })}
              data-info={`${filteredBranches.length}:${branches.length}`}
              disabled={disabled}
              icon={
                (clipBoard && 'clipboard')
                || (del && branchesObj[item]?.local && 'trash')
                || (item === value && !branchesObj[item]?.remote && 'issue-closed')
                || (item === value && 'selection')
                || (!branchesObj[item]?.remote && 'issue')
                || (!branchesObj[item]?.local && 'cloud')
                || 'circle'
              }
              key={index}
              tagName={'div'}
              text={highlightText(item, query)}
              onClick={handleClick}
            />
          );
        }}
        items={getBranchNames(filteredBranches)}
        popoverProps={{
          portalClassName: css.popoverRoot
        }}
        resetOnClose={true}
        onItemSelect={(item, event: any) => onItemSelect({ event, item, onChange, openModal, project })}
        onQueryChange={setQuery}
      >
        <Button
          disabled={disabled}
          rightIcon='double-caret-vertical'
          text={value || defaultValue}
        />
      </Select>
    </Root>
    // eslint-disable-next-line
  );
};