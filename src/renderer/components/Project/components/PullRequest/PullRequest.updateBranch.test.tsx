// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { __reset } from 'renderer/services/poller/coordinator';
import { type Pull } from 'types/gitHub';
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

const checksResponse = (behind: boolean) => ({
  allowedMergeMethods: ['merge'],
  autoMergeAllowed: false,
  autoMergeEnabled: false,
  behind,
  checks: [],
  mergeableState: 'clean',
  review: null,
  success: true,
  unresolvedComments: 0,
  unresolvedThreads: []
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

  it('clears the button once GitHub settles, polling past the stale post-update read that still reports behind', async () => {
    // Mount sees behind: true. The update succeeds, but GitHub's first recompute
    // still says behind (eventual consistency); the coordinator's hot re-poll
    // burst (mutate) keeps reading until one reports it caught up.
    vi.mocked(window.bridge.gitAPI.getPRChecks)
      .mockResolvedValueOnce(checksResponse(true)) // mount
      .mockResolvedValueOnce(checksResponse(true)) // first re-poll: still stale
      .mockResolvedValue(checksResponse(false)); // later polls: settled
    vi.mocked(window.bridge.gitAPI.updateBranch).mockResolvedValue({ success: true });

    render(<PullRequest projectId="project-1"
      pull={basePull}
           />);

    expect(await screen.findByText('Update branch')).toBeTruthy();

    fireEvent.click(screen.getByText('Update branch'));

    // Polls run behind the spinner; the affordance disappears only after a read
    // actually reports the branch is no longer behind.
    await waitFor(() => expect(caret()).toBeNull(), { timeout: 5000 });

    // And it stays gone — no flicker back to "Update branch".
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(caret()).toBeNull();

    expect(window.bridge.gitAPI.updateBranch).toHaveBeenCalledWith('project-1', 1, 'merge');
    // mount + at least two re-polls (the stale one, then the settled one).
    expect(vi.mocked(window.bridge.gitAPI.getPRChecks).mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('keeps the button while GitHub still reports the branch behind, instead of falsely hiding it', async () => {
    // GitHub never catches up. The button must NOT lie and hide — it stays
    // until a real "not behind" read (or the next refresh).
    vi.mocked(window.bridge.gitAPI.getPRChecks).mockResolvedValue(checksResponse(true));
    vi.mocked(window.bridge.gitAPI.updateBranch).mockResolvedValue({ success: true });

    render(<PullRequest projectId="project-1"
      pull={basePull}
           />);

    expect(await screen.findByText('Update branch')).toBeTruthy();
    fireEvent.click(screen.getByText('Update branch'));

    // Past the first re-poll (which still reports behind) the affordance is
    // still present — a spinner, not a vanished button.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(caret()).not.toBeNull();
  });
});
