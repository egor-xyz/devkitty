import { BranchSummary, StatusResult } from 'simple-git';

type Status = Omit<StatusResult, 'isClean'> & { isClean: boolean };

export type Project = {
  filePath: string;
  group?: string;
  id: string;
  name: string;
};

export type Projects = Project[];

export type GitStatus = {
  branchSummary?: BranchSummary;
  message?: string;
  organization?: string;
  origin?: string;
  status?: Status;
  success: boolean;
};
