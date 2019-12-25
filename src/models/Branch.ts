export interface Branch {
  name: string;
  remote: string | undefined;
  local: boolean;
  current: boolean;
}
export type BranchesObj = {
  [name: string] : Branch;
};

export type Branches = Branch[];