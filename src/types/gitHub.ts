import { type GetResponseDataTypeFromEndpointMethod } from '@octokit/types';
import { type Octokit } from 'octokit';

export type MergeableState =
  | 'behind'
  | 'blocked'
  | 'clean'
  | 'dirty'
  | 'draft'
  | 'has_hooks'
  | 'unknown'
  | 'unstable';

export type MergeMethod = 'merge' | 'rebase' | 'squash';
export type PRCheck = { conclusion: null | string; id: number; name: string; status: string };
export type PRReview = {
  approvedBy: string[];
  changesRequestedBy: string[];
  reviewers: PRReviewer[];
  state: 'approved' | 'changes_requested' | null;
};
export type PRReviewer = {
  avatarUrl: string;
  login: string;
  reReviewRequested: boolean;
  state: 'approved' | 'changes_requested' | 'commented' | 'pending';
};
export type PRStatus = {
  allowedMergeMethods: MergeMethod[];
  autoMergeAllowed: boolean;
  autoMergeEnabled: boolean;
  behind: boolean;
  checks: PRCheck[];
  mergeable: boolean | null;
  mergeableState: MergeableState;
  review: null | PRReview;
  success: true;
  unresolvedComments: number;
  unresolvedThreads: PRThread[];
  workflowRuns: Run[];
};

export type PRStatusResult = PRStatus | { message: string; success: false };

export type PRThread = { avatarUrl: string; count: number; login: string; path: null | string };
export type Pull = GetResponseDataTypeFromEndpointMethod<typeof Octokit.prototype.rest.pulls.list>[0];
export type Run = GetResponseDataTypeFromEndpointMethod<
  typeof Octokit.prototype.rest.actions.listWorkflowRunsForRepo
>['workflow_runs'][0];

export const pullTypes = ['author', 'review-requested', 'mentions', 'assigned'] as const;
export type PullType = (typeof pullTypes)[number];
