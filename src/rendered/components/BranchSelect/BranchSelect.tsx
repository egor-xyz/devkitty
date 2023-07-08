import { MenuItem } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import clsx from 'clsx';
import { FC, useState } from 'react';

import { GitStatus } from 'types/project';

import { GlobalStyles, SelectButton, StyledMenuItem } from './BranchSelect.styles';

type Props = {
  className?: string;
  currentBranch?: string;
  fill?: boolean;
  gitStatus: GitStatus;
  loading?: boolean;
  onSelect: (branch: string) => void;
};

// TODO: fix this
const LIMIT = 5;

export const BranchSelect: FC<Props> = ({ gitStatus, onSelect, loading, currentBranch, fill = false, className }) => {
  const [query, setQuery] = useState('');

  const { branchSummary } = gitStatus ?? {};

  const items = (branchSummary?.all ?? [])
    .filter((item) => item.toLowerCase().includes(query.toLowerCase()))
    .map((item) => item.replace('remotes/', ''))
    .slice(0, LIMIT);

  return (
    <>
      <GlobalStyles />
      <Select<string>
        className={className}
        inputProps={{ placeholder: 'Search...' }}
        itemRenderer={(name, { index, modifiers: { active }, handleClick }) => (
          <StyledMenuItem
            active={active}
            className={clsx({
              help: index === LIMIT,
              infoFirst: index === 0
            })}
            icon={(name === currentBranch && 'selection') || 'circle'}
            key={index}
            text={name}
            onClick={handleClick}
          />
        )}
        items={items}
        noResults={
          <MenuItem
            disabled={true}
            roleStructure="listoption"
            text="No results."
          />
        }
        popoverContentProps={{ className: 'branchSelectPopoverList' }}
        popoverProps={{ placement: 'bottom-start' }}
        resetOnSelect={true}
        onItemSelect={onSelect}
        onQueryChange={setQuery}
      >
        <SelectButton
          small
          fill={fill}
          loading={loading}
          placeholder="Select a film"
          rightIcon="double-caret-vertical"
          text={currentBranch}
        />
      </Select>
    </>
  );
};
