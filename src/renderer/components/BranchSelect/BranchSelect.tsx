import { Button, MenuItem } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import { type FC, useState } from 'react';
import { cn } from 'renderer/utils/cn';
import { type GitStatus } from 'types/project';

type Props = {
  className?: string;
  currentBranch?: string;
  disabled?: boolean;
  excludeBranches?: string[];
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
  excludeBranches,
  fill = false,
  gitStatus,
  loading,
  onSelect
}) => {
  const [query, setQuery] = useState('');

  const { branchSummary } = gitStatus ?? {};

  const excluded = excludeBranches ?? [];

  const items = (branchSummary?.all ?? [])
    .filter(
      (item) =>
        item.toLowerCase().includes(query.toLowerCase()) &&
        !excluded.includes(item) &&
        !excluded.includes(item.replace('remotes/origin/', ''))
    )
    .map((item) => item.replace('remotes/', ''))
    .slice(0, LIMIT);

  return (
    <Select<string>
      className={className}
      disabled={disabled}
      inputProps={{ placeholder: 'Search...' }}
      itemRenderer={(name, { handleClick, index, modifiers: { active } }) => (
        <MenuItem
          active={active}
          className={cn('max-w-[230px]', {
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
      <Button
        className="branch-select-button"
        disabled={disabled}
        fill={fill}
        loading={loading}
        rightIcon="double-caret-vertical"
        small
        text={currentBranch}
      />
    </Select>
  );
};
