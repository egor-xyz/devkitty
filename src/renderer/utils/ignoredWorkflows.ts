import { type IgnoredWorkflow, type WorkflowScope } from 'types/ignoredWorkflow';

export { type IgnoredWorkflow, type WorkflowScope } from 'types/ignoredWorkflow';

// Where a run renders, which is all the scope test needs: is it in the main
// card (root) or a worktree card, and is it a pull-request run.
export type RunContext = {
  isPr: boolean;
  isRoot: boolean;
  path?: null | string;
};

const validScopes: WorkflowScope[] = ['all', 'root', 'worktree', 'pr', 'non-pr'];

const isScope = (value: unknown): value is WorkflowScope => validScopes.includes(value as WorkflowScope);

// Order scopes for stable rendering regardless of the order they were added in.
const scopeOrder = (scope: WorkflowScope) => validScopes.indexOf(scope);

/**
 * Hidden workflows used to be stored as bare `string[]` paths, meaning "hide
 * everywhere". A later shape carried `{ path }` objects. Both migrate forward to
 * scoped entries so nothing hidden before the change gets stranded, and an entry
 * with no recognisable scope falls back to `all`.
 */
export const parseIgnored = (raw: unknown): IgnoredWorkflow[] => {
  if (!Array.isArray(raw)) return [];

  const byPath = new Map<string, Set<WorkflowScope>>();

  for (const item of raw) {
    let path: string | undefined;
    let scopes: WorkflowScope[] = ['all'];

    if (typeof item === 'string') {
      path = item;
    } else if (item && typeof item === 'object' && typeof (item as { path?: unknown }).path === 'string') {
      const { path: storedPath, scopes: storedScopes } = item as { path: string; scopes?: unknown };
      const kept = Array.isArray(storedScopes) ? storedScopes.filter(isScope) : [];
      path = storedPath;
      scopes = kept.length > 0 ? kept : ['all'];
    }

    if (!path) continue;

    const set = byPath.get(path) ?? new Set<WorkflowScope>();
    for (const scope of scopes) set.add(scope);
    byPath.set(path, set);
  }

  return [...byPath.entries()].map(([path, set]) => ({
    path,
    scopes: [...set].sort((a, b) => scopeOrder(a) - scopeOrder(b))
  }));
};

export const scopeMatches = (scope: WorkflowScope, { isPr, isRoot }: RunContext): boolean => {
  switch (scope) {
    case 'all':
      return true;
    case 'non-pr':
      return !isPr;
    case 'pr':
      return isPr;
    case 'root':
      return isRoot && !isPr;
    case 'worktree':
      return !isRoot && !isPr;
    default:
      return false;
  }
};

export const isWorkflowHidden = (entries: IgnoredWorkflow[], ctx: RunContext): boolean => {
  if (!ctx.path) return false;

  const entry = entries.find((item) => item.path === ctx.path);

  return entry ? entry.scopes.some((scope) => scopeMatches(scope, ctx)) : false;
};

export const addScope = (entries: IgnoredWorkflow[], path: string, scope: WorkflowScope): IgnoredWorkflow[] => {
  const existing = entries.find((item) => item.path === path);

  if (!existing) return [...entries, { path, scopes: [scope] }];
  if (existing.scopes.includes(scope)) return entries;

  return entries.map((item) =>
    item.path === path
      ? { ...item, scopes: [...item.scopes, scope].sort((a, b) => scopeOrder(a) - scopeOrder(b)) }
      : item
  );
};

// Dropping the last scope of a workflow removes the workflow entirely, so an
// unhidden workflow leaves no empty row behind.
export const removeScope = (entries: IgnoredWorkflow[], path: string, scope: WorkflowScope): IgnoredWorkflow[] =>
  entries
    .map((item) => (item.path === path ? { ...item, scopes: item.scopes.filter((s) => s !== scope) } : item))
    .filter((item) => item.scopes.length > 0);

const scopeLabels: Record<WorkflowScope, string> = {
  all: 'Everywhere',
  'non-pr': 'Non-PR',
  pr: 'Pull requests',
  root: 'main',
  worktree: 'worktrees'
};

export const scopeLabel = (scope: WorkflowScope): string => scopeLabels[scope];
