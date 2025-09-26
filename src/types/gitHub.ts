import type { Endpoints } from '@octokit/types';

export type Pull = Endpoints['GET /search/issues']['response']['data']['items'][0];

export type Run = Endpoints['GET /repos/{owner}/{repo}/actions/runs']['response']['data']['workflow_runs'][0];

export const pullTypes = ['author', 'review-requested', 'mentions', 'assigned'] as const;
export type PullType = (typeof pullTypes)[number];
