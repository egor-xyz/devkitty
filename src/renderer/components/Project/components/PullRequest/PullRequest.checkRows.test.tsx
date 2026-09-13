// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { __reset, getSnapshot, refresh } from 'renderer/services/poller/coordinator';
import { type PRStatus, type Pull, type Run } from 'types/gitHub';
import { type Project } from 'types/project';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('renderer/assets/gitHubStatusUtils', () => ({
  getStatusIcon: () => () => <span data-testid="workflow-status" />
}));

import { PullRequest } from './PullRequest';

const project = { filePath: '/repo', id: 'project-1', name: 'repo' } as Project;

const pull = {
  created_at: '2026-09-01T00:00:00Z',
  draft: false,
  head: { sha: 'exact-head-sha' },
  html_url: 'https://github.com/example/repo/pull/42',
  id: 42,
  labels: [],
  merged_at: null,
  number: 42,
  state: 'open',
  title: 'Keep PR checks after the cache expires',
  updated_at: '2026-09-12T00:00:00Z',
  user: { avatar_url: 'https://example.com/avatar.png', login: 'octocat', type: 'User' }
} as unknown as Pull;

const oldSuccessfulRun = {
  conclusion: 'success',
  created_at: '2026-09-06T00:00:00Z',
  display_title: 'Keep PR checks after the cache expires',
  event: 'pull_request',
  head_branch: 'feature/check-rows',
  head_sha: 'exact-head-sha',
  html_url: 'https://github.com/example/repo/actions/runs/9001',
  id: 9001,
  name: 'Services Unit Testing',
  path: '.github/workflows/test.yml',
  run_number: 12,
  status: 'completed',
  updated_at: '2026-09-06T00:03:00Z'
} as Run;

const activeRun = {
  ...oldSuccessfulRun,
  conclusion: null,
  id: 9002,
  name: 'Current Head Build',
  status: 'in_progress'
} as Run;

const status = (overrides: Partial<PRStatus> = {}): PRStatus => ({
  allowedMergeMethods: ['merge'],
  autoMergeAllowed: false,
  autoMergeEnabled: false,
  behind: false,
  checks: Array.from({ length: 28 }, (_, id) => ({
    conclusion: id < 23 ? 'success' : 'failure',
    id,
    name: `check-${id}`,
    status: 'completed'
  })),
  mergeable: false,
  mergeableState: 'blocked',
  review: { approvedBy: [], changesRequestedBy: [], reviewers: [], state: null },
  success: true,
  unresolvedComments: 0,
  unresolvedThreads: [],
  workflowRuns: [oldSuccessfulRun],
  ...overrides
});

describe('PullRequest workflow rows', () => {
  beforeEach(() => {
    __reset();
    useAppSettings.setState((current) => ({
      gitHubActions: { ...current.gitHubActions, ignoredWorkflows: [] }
    }));
    vi.mocked(window.bridge.gitAPI.getPRChecks).mockResolvedValue(status());
  });

  afterEach(() => {
    __reset();
    vi.clearAllMocks();
  });

  it('shows an old exact-head passing workflow when the repo run cache is empty', async () => {
    render(
      <PullRequest
        isRoot
        onRefresh={vi.fn()}
        project={project}
        pull={pull}
        stickyTop={55}
      />
    );

    expect(await screen.findByText('23/28')).toBeTruthy();
    const fold = await screen.findByText('Passing checks');
    fireEvent.click(fold);
    expect(await screen.findByText('Services Unit Testing', { exact: false })).toBeTruthy();
  });

  it('uses a separate status cache for each PR head SHA', async () => {
    const { rerender } = render(
      <PullRequest isRoot
        onRefresh={vi.fn()}
        project={project}
        pull={pull}
        stickyTop={55}
      />
    );

    await waitFor(() => expect(window.bridge.gitAPI.getPRChecks).toHaveBeenCalledTimes(1));
    expect(getSnapshot<PRStatus>('prChecks:project-1:42:exact-head-sha')).toBeTruthy();

    const nextPull = { ...pull, head: { sha: 'next-head-sha' } } as Pull;
    rerender(<PullRequest isRoot
      onRefresh={vi.fn()}
      project={project}
      pull={nextPull}
      stickyTop={55}
             />);

    await waitFor(() => expect(window.bridge.gitAPI.getPRChecks).toHaveBeenCalledTimes(2));
    expect(getSnapshot<PRStatus>('prChecks:project-1:42:next-head-sha')).toBeTruthy();
  });

  it('keeps the last good status when a later bridge read fails', async () => {
    vi.mocked(window.bridge.gitAPI.getPRChecks)
      .mockResolvedValueOnce(status({ workflowRuns: [activeRun] }))
      .mockResolvedValue({ message: 'GitHub is unavailable', success: false });

    render(<PullRequest isRoot
      onRefresh={vi.fn()}
      project={project}
      pull={pull}
      stickyTop={55}
           />);
    expect(await screen.findByText('Current Head Build', { exact: false })).toBeTruthy();

    refresh('prChecks:project-1:42:exact-head-sha');
    await waitFor(() => expect(window.bridge.gitAPI.getPRChecks).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Current Head Build', { exact: false })).toBeTruthy();
  });

  it('hides an exact-head row when its workflow is hidden on pull requests', async () => {
    useAppSettings.setState((current) => ({
      gitHubActions: {
        ...current.gitHubActions,
        ignoredWorkflows: [{ path: activeRun.path, scopes: ['pr'] }]
      }
    }));
    vi.mocked(window.bridge.gitAPI.getPRChecks).mockResolvedValue(status({ workflowRuns: [activeRun] }));

    render(<PullRequest isRoot
      onRefresh={vi.fn()}
      project={project}
      pull={pull}
      stickyTop={55}
           />);

    await waitFor(() => expect(window.bridge.gitAPI.getPRChecks).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Current Head Build', { exact: false })).toBeNull();
  });

  it('keeps a PR row when the workflow is hidden only on worktrees', async () => {
    useAppSettings.setState((current) => ({
      gitHubActions: {
        ...current.gitHubActions,
        ignoredWorkflows: [{ path: activeRun.path, scopes: ['worktree'] }]
      }
    }));
    vi.mocked(window.bridge.gitAPI.getPRChecks).mockResolvedValue(status({ workflowRuns: [activeRun] }));

    render(<PullRequest isRoot={false}
      onRefresh={vi.fn()}
      project={project}
      pull={pull}
      stickyTop={55}
           />);

    expect(await screen.findByText('Current Head Build', { exact: false })).toBeTruthy();
  });
});
