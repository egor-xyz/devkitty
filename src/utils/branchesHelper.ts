import find from 'lodash/find';

import { Branch, Branches, BranchesObj } from 'models/Branch';
import { Project } from 'models';

export const getLocalBranches = (branches: Branches): Branches => branches.filter(b => b.local);

export const getRemoteBranches = (branches: Branches): Branches => branches.filter(b => !b.local);

export const getBranchNames = (branches: Branches): string[] => branches.map(b => b.name);

export const getBranchesObj = (branches: Branches): BranchesObj => {
  const branchesObj: BranchesObj = {};
  branches.forEach(b => branchesObj[b.name] = b);
  return branchesObj;
};

export const getCurrentBranch = ({ branch: { current },branches }: Project): Partial<Branch> => {
  return find(branches, { name: current }) ?? {};
};