// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { __reset } from 'renderer/services/poller/coordinator';
import { type PRStatus, type Pull } from 'types/gitHub';
import { type Project } from 'types/project';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PullRequest } from './PullRequest';

const basePull = {
  created_at: '2026-01-01T00:00:00Z',
  draft: false,
  head: { sha: 'abc123' },
  html_url: 'https://github.com/example/example/pull/1',
  id: 1,
  labels: [],
  merged_at: null,
  number: 1,
  state: 'open',
  title: 'Add a great feature',
  updated_at: '2026-01-01T00:00:00Z',
  user: { avatar_url: 'https://example.com/avatar.png', login: 'octocat', type: 'User' }
} as unknown as Pull;

const project = { id: 'project-1' } as Project;

type ChecksResponseOptions = Partial<Pick<PRStatus, 'behind' | 'checks'>> & Pick<PRStatus, 'mergeableState'>;

const checksResponse = ({ behind = false, checks = [], mergeableState }: ChecksResponseOptions): PRStatus => ({
  allowedMergeMethods: ['merge'],
  autoMergeAllowed: false,
  autoMergeEnabled: false,
  behind,
  checks,
  mergeable: mergeableState === 'clean',
  mergeableState,
  review: { approvedBy: [], changesRequestedBy: [], reviewers: [], state: null },
  success: true,
  unresolvedComments: 0,
  unresolvedThreads: [],
  workflowRuns: []
});

// The whole "Update branch" split button (including this caret) is gated on
// `behind`; querying the caret tells us the affordance is truly mounted, without
// being confused by the primary button's loading spinner (which hides its text).
const caret = () => screen.queryByLabelText('Update branch options');

describe('PullRequest "Update branch" button', () => {
  beforeEach(() => {
    __reset();
    vi.mocked(window.bridge.gitAPI.getPRChecks).mockReset();
    vi.mocked(window.bridge.gitAPI.updateBranch).mockReset();
  });

  afterEach(() => {
    __reset();
    vi.clearAllMocks();
  });

  it('moves from Update branch through blocked checks and restores Merge', async () => {
    // The update succeeds. GitHub then reports completed branch sync but still
    // has a pending check and a blocked merge state. A later read is clean.
    vi.mocked(window.bridge.gitAPI.getPRChecks)
      .mockResolvedValueOnce(checksResponse({ behind: true, mergeableState: 'clean' })) // mount
      .mockResolvedValueOnce(checksResponse({ checks: [{ conclusion: null, id: 1, name: 'CI', status: 'in_progress' }], mergeableState: 'blocked' }))
      .mockResolvedValue(checksResponse({ mergeableState: 'clean' }));
    vi.mocked(window.bridge.gitAPI.updateBranch).mockResolvedValue({ success: true });

    render(<PullRequest isRoot={false}
      onRefresh={vi.fn()}
      project={project}
      pull={basePull}
      stickyTop={55}
           />);

    expect(await screen.findByText('Update branch')).toBeTruthy();

    fireEvent.click(screen.getByText('Update branch'));

    await screen.findByText('Merge blocked', {}, { timeout: 5000 });
    expect(caret()).toBeNull();
    await screen.findByText('Create a merge commit', {}, { timeout: 5000 });
    expect(screen.queryByText('Merge blocked')).toBeNull();

    expect(window.bridge.gitAPI.updateBranch).toHaveBeenCalledWith('project-1', 1, 'merge');
    // Mount plus the blocked and clean reads.
    expect(vi.mocked(window.bridge.gitAPI.getPRChecks).mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('shows Merge blocked for a stable blocked PR', async () => {
    vi.mocked(window.bridge.gitAPI.getPRChecks).mockResolvedValue(checksResponse({ mergeableState: 'blocked' }));

    render(<PullRequest isRoot={false}
      onRefresh={vi.fn()}
      project={project}
      pull={basePull}
      stickyTop={55}
           />);

    expect(await screen.findByText('Merge blocked')).toBeTruthy();
    expect(screen.queryByText('Update branch')).toBeNull();
    expect(screen.queryByText('Create a merge commit')).toBeNull();
  });

  it('starts only one mutation while a merge is pending', async () => {
    let resolveMerge: (result: { success: true }) => void;
    const mergePending = new Promise<{ success: true }>((resolve) => { resolveMerge = resolve; });
    vi.mocked(window.bridge.gitAPI.getPRChecks).mockResolvedValue(checksResponse({ mergeableState: 'clean' }));
    vi.mocked(window.bridge.gitAPI.mergePR).mockReturnValue(mergePending);

    render(<PullRequest isRoot={false}
      onRefresh={vi.fn()}
      project={project}
      pull={basePull}
      stickyTop={55}
           />);

    const mergeButton = await screen.findByText('Create a merge commit');
    fireEvent.click(mergeButton);
    fireEvent.click(mergeButton);

    expect(window.bridge.gitAPI.mergePR).toHaveBeenCalledTimes(1);
    expect(mergeButton.getAttribute('disabled')).not.toBeNull();
    await act(async () => {
      resolveMerge!({ success: true });
      await mergePending;
    });
  });
});
