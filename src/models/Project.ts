import { BranchSummary, StatusResult } from 'simple-git/promise';
import { GitUrl } from 'git-url-parse';

import { Branches } from 'models/Branch';

export interface Project {
  branch: BranchSummary;
  branches: Branches;
  git?: GitUrl;
  node?: string;
  path: string;
  repo: string;
  status: StatusResult;
}

export interface ProjectWithError {
  message: string;
  path: string;
  repo: string;
}

export type Projects = Project[];

export interface ProjectSettings {
  groupId?: string,
  repo: string
}
export interface ProjectsSettings {
  [repo: string]: ProjectSettings;
}