import { MenuItem } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import clsx from 'clsx';
import { type FC, useState } from 'react';
import { type GitStatus } from 'types/project';

import { GlobalStyles, SelectButton, StyledMenuItem } from './BranchSelect.styles';

type Props = {
  className?: string;
  currentBranch?: string;
  disabled?: boolean;
  fill?: boolean;
  gitStatus: GitStatus;
  loading?: boolean;
  onSelect: (branch: string) => void;
};

// TODO: fix this
const LIMIT = 5;

export const BranchSelect: FC<Props> = ({
  className,
  currentBranch,
  disabled,
  fill = false,
  gitStatus,
  loading,
  onSelect
}) => {
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
        disabled={disabled}
        inputProps={{ placeholder: 'Search...' }}
        itemRenderer={(name, { handleClick, index, modifiers: { active } }) => (
          <StyledMenuItem
            active={active}
            className={clsx({
              help: index === LIMIT,
              infoFirst: index === 0
            })}
            icon={(name === currentBranch && 'selection') || 'circle'}
            key={index}
            onClick={handleClick}
            text={name}
          />
        )}
        items={items}
        noResults={
          <MenuItem
            disabled
            roleStructure="listoption"
            text="No results."
          />
        }
        onItemSelect={onSelect}
        onQueryChange={setQuery}
        popoverContentProps={{ className: 'branchSelectPopoverList' }}
        popoverProps={{ placement: 'bottom-start' }}
        resetOnSelect
      >
        <SelectButton
          disabled={disabled}
          fill={fill}
          loading={loading}
          rightIcon="double-caret-vertical"
          small
          text={currentBranch}
        />
      </Select>
    </>
  );
};
