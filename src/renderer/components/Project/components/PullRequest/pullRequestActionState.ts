import { type MergeableState } from 'types/gitHub';

type PullRequestActionState = {
  autoMerge: boolean;
  blocked: boolean;
  conflicts: boolean;
  merge: boolean;
  recomputing: boolean;
  update: boolean;
};

type PullRequestActionStateInput = {
  autoMergeEnabled: boolean;
  behind: boolean;
  isOpen: boolean;
  mergeableState: MergeableState;
};

export const getPullRequestActionState = ({
  autoMergeEnabled,
  behind,
  isOpen,
  mergeableState
}: PullRequestActionStateInput): PullRequestActionState => {
  const conflicts = isOpen && mergeableState === 'dirty';
  const recomputing = isOpen && mergeableState === 'unknown';
  const update = isOpen && behind && !conflicts;
  const merge = isOpen && ['clean', 'has_hooks', 'unstable'].includes(mergeableState);
  const autoMerge = isOpen && autoMergeEnabled;
  const blocked = isOpen && !update && !merge && !conflicts && !recomputing && !autoMerge;

  return { autoMerge, blocked, conflicts, merge, recomputing, update };
};
