import { GetResponseDataTypeFromEndpointMethod } from '@octokit/types';
import { Octokit } from 'octokit';

const octokit = new Octokit();

export type Run = GetResponseDataTypeFromEndpointMethod<
  typeof octokit.rest.actions.listWorkflowRunsForRepo
>['workflow_runs'][0];

export type Pull = GetResponseDataTypeFromEndpointMethod<typeof octokit.rest.pulls.list>[0];
