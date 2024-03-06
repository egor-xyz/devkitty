import { GetResponseDataTypeFromEndpointMethod } from '@octokit/types';
import { Octokit } from 'octokit';

const octokit = new Octokit();
const { listWorkflowRunsForRepo } = octokit.rest.actions;

export type Run = GetResponseDataTypeFromEndpointMethod<typeof listWorkflowRunsForRepo>['workflow_runs'][0];
