import { type BranchSummary, type StatusResult } from 'simple-git';

import { type Worktree } from './worktree';

export type GitStatus = {
  branchSummary?: BranchSummary;
  message?: string;
  organization?: string;
  origin?: string;
  status?: Status;
  success: boolean;
  worktrees?: Worktree[];
};

export type Project = {
  filePath: string;
  groupId?: string; // new groups
  id: string;
  name: string;
};

export type Projects = Project[];

type Status = Omit<StatusResult, 'isClean'> & { isClean: boolean };
