import { type BranchSummary, type StatusResult } from 'simple-git';

export type GitStatus = {
  branchSummary?: BranchSummary;
  message?: string;
  organization?: string;
  origin?: string;
  status?: Status;
  success: boolean;
};

export type Project = {
  filePath: string;
  groupId?: string; // new groups
  id: string;
  name: string;
};

export type Projects = Project[];

type Status = Omit<StatusResult, 'isClean'> & { isClean: boolean };
