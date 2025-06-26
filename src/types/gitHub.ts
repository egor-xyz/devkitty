import { type GetResponseDataTypeFromEndpointMethod } from '@octokit/types';
import { type Octokit } from 'octokit';

export type Pull = GetResponseDataTypeFromEndpointMethod<
  typeof Octokit.prototype.rest.search.issuesAndPullRequests
>['items'][0];

export type Run = GetResponseDataTypeFromEndpointMethod<
  typeof Octokit.prototype.rest.actions.listWorkflowRunsForRepo
>['workflow_runs'][0];

export const pullTypes = ['author', 'review-requested', 'mentions', 'assigned'] as const;
export type PullType = (typeof pullTypes)[number];
