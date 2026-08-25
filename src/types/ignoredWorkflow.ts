export type IgnoredWorkflow = {
  path: string;
  scopes: WorkflowScope[];
};

// A workflow can be hidden in more than one place at once. The scopes are
// buckets, not independent axes: a pull-request run is only ever a `pr`, and a
// push/manual run is a `root`/`worktree`/`non-pr`. That is why hiding on
// worktrees leaves the PR checks alone — a PR run never matches `worktree`.
export type WorkflowScope = 'all' | 'non-pr' | 'pr' | 'root' | 'worktree';
