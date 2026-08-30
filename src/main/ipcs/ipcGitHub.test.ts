import { beforeEach, describe, expect, it, vi } from 'vitest';

const handlers: Record<string, (...args: any[]) => any> = {};

const mockOctokitInstance = {
  graphql: vi.fn(),
  rest: {
    actions: {
      cancelWorkflowRun: vi.fn(),
      listJobsForWorkflowRun: vi.fn(),
      listRepoWorkflows: vi.fn(),
      listWorkflowRuns: vi.fn(),
      listWorkflowRunsForRepo: vi.fn(),
      reRunWorkflow: vi.fn(),
      reRunWorkflowFailedJobs: vi.fn()
    },
    checks: {
      listForRef: vi.fn()
    },
    git: {
      getRef: vi.fn(),
      updateRef: vi.fn()
    },
    pulls: {
      get: vi.fn(),
      list: vi.fn(),
      listReviews: vi.fn()
    },
    repos: {
      compareCommits: vi.fn()
    },
    search: {
      issuesAndPullRequests: vi.fn()
    }
  }
};

const mockExecFile = vi.fn();

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: any) => {
      handlers[channel] = handler;
    })
  },
  safeStorage: {
    decryptString: vi.fn((buf: Buffer) => 'decrypted-token')
  }
}));

vi.mock('electron-log', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn()
  }
}));

vi.mock('octokit', () => ({
  Octokit: class MockOctokit {
    graphql = mockOctokitInstance.graphql;
    rest = mockOctokitInstance.rest;
  }
}));

vi.mock('../libs/git', () => ({
  getProjectPath: vi.fn(),
  getRepoInfo: vi.fn()
}));

vi.mock('../settings', () => ({
  settings: {
    get: vi.fn()
  }
}));

vi.mock('child_process', () => ({
  execFile: mockExecFile
}));

import { getProjectPath, getRepoInfo } from '../libs/git';
import { settings } from '../settings';

await import('./ipcGitHub');

const mockSettings = vi.mocked(settings);
const mockGetRepoInfo = vi.mocked(getRepoInfo);
const mockGetProjectPath = vi.mocked(getProjectPath);

type ExecFileCallback = (error: unknown, stdout?: string, stderr?: string) => void;

// Default: every `execFile` call succeeds with empty output. Individual tests
// override with `mockImplementationOnce` to simulate a specific failure.
const execFileSuccess = (_file: string, _args: string[], _options: unknown, callback: ExecFileCallback) => {
  callback(null, '', '');
};

describe('ipcGitHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings.get.mockReturnValue({
      gitHubActions: { all: true, count: 3, inProgress: false },
      gitHubToken: Buffer.from('encrypted-token')
    } as any);
    mockGetRepoInfo.mockResolvedValue({ owner: 'egor-xyz', repo: 'devkitty' });
    mockGetProjectPath.mockReturnValue('/repo/path');
    mockExecFile.mockImplementation(execFileSuccess);
  });

  describe('git:api:getRunsPage', () => {
    it('should scope a history page to the branch that asked for it', async () => {
      mockOctokitInstance.rest.actions.listWorkflowRunsForRepo.mockResolvedValue({
        data: { workflow_runs: [{ id: 1 }] }
      });

      const result = await handlers['git:api:getRunsPage']({}, 'proj-1', 2, 'HERO-1/thing');

      expect(mockOctokitInstance.rest.actions.listWorkflowRunsForRepo).toHaveBeenCalledWith(
        expect.objectContaining({ branch: 'HERO-1/thing', page: 2, per_page: 100 })
      );
      // A short page is the end of that branch's history.
      expect(result).toEqual({ last: true, runs: [{ id: 1 }], success: true });
    });

    it('should page the whole repo when no branch is given', async () => {
      mockOctokitInstance.rest.actions.listWorkflowRunsForRepo.mockResolvedValue({
        data: { workflow_runs: Array.from({ length: 100 }, (_, index) => ({ id: index })) }
      });

      const result = await handlers['git:api:getRunsPage']({}, 'proj-1', 1);

      expect(mockOctokitInstance.rest.actions.listWorkflowRunsForRepo).toHaveBeenCalledWith(
        expect.not.objectContaining({ branch: expect.anything() })
      );
      expect(result.last).toBe(false);
    });
  });

  describe('git:api:reset', () => {
    it('should reset a branch to target sha', async () => {
      mockOctokitInstance.rest.git.getRef.mockResolvedValue({
        data: { object: { sha: 'abc123' } }
      });
      mockOctokitInstance.rest.git.updateRef.mockResolvedValue({});

      const result = await handlers['git:api:reset']({}, 'proj-1', 'feature', 'main');

      expect(result).toEqual({ message: 'Branch feature was reset to main', success: true });
    });

    it('should forbid resetting protected branches', async () => {
      const result = await handlers['git:api:reset']({}, 'proj-1', 'main', 'develop');

      expect(result.success).toBe(false);
      expect(result.message).toContain('forbidden to reset');
    });

    it('should forbid resetting master branch', async () => {
      const result = await handlers['git:api:reset']({}, 'proj-1', 'master', 'develop');

      expect(result.success).toBe(false);
      expect(result.message).toContain('forbidden to reset');
    });

    it('should return error when GitHub token is not found', async () => {
      mockSettings.get.mockReturnValue({ gitHubToken: null } as any);

      const result = await handlers['git:api:reset']({}, 'proj-1', 'feature', 'main');

      expect(result.success).toBe(false);
      expect(result.message).toContain('GitHub token not found');
    });

    it('should return error when repo info is not found', async () => {
      mockGetRepoInfo.mockResolvedValue({});

      const result = await handlers['git:api:reset']({}, 'proj-1', 'feature', 'main');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Project not found');
    });

    it('should return error when target branch SHA is not found', async () => {
      mockOctokitInstance.rest.git.getRef.mockResolvedValue({
        data: { object: {} }
      });

      const result = await handlers['git:api:reset']({}, 'proj-1', 'feature', 'nonexistent');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Target branch not found');
    });
  });

  describe('git:api:getRuns', () => {
    const recent = new Date().toISOString();
    const old = new Date(Date.now() - 90000000).toISOString();

    beforeEach(() => {
      mockGetRepoInfo.mockResolvedValue({ owner: 'owner', repo: 'repo' });
      mockSettings.get.mockReturnValue({
        gitHubActions: { count: 5, inProgress: false },
        gitHubToken: Buffer.from('token')
      } as any);
    });

    it('should return runs from every branch without slicing', async () => {
      mockOctokitInstance.rest.actions.listWorkflowRunsForRepo.mockResolvedValue({
        data: {
          total_count: 3,
          workflow_runs: [
            { created_at: recent, head_branch: 'main', id: 1, path: '.github/workflows/ci.yml' },
            { created_at: recent, head_branch: 'feature', id: 2, path: '.github/workflows/ci.yml' },
            { created_at: recent, head_branch: 'other', id: 3, path: '.github/workflows/ci.yml' }
          ]
        }
      });

      const result = await handlers['git:api:getRuns']({}, 'proj-1');

      expect(result.success).toBe(true);
      expect(result.runs.map((run: any) => run.id)).toEqual([1, 2, 3]);
    });

    it('should drop runs older than 24 hours', async () => {
      mockOctokitInstance.rest.actions.listWorkflowRunsForRepo.mockResolvedValue({
        data: {
          total_count: 2,
          workflow_runs: [
            { created_at: recent, head_branch: 'main', id: 1, path: '.github/workflows/ci.yml' },
            { created_at: old, head_branch: 'main', id: 2, path: '.github/workflows/ci.yml' }
          ]
        }
      });

      const result = await handlers['git:api:getRuns']({}, 'proj-1');

      expect(result.runs.map((run: any) => run.id)).toEqual([1]);
    });

    it('should return hidden workflows too, so the renderer can offer a peek', async () => {
      mockSettings.get.mockReturnValue({
        gitHubActions: { count: 5, ignoredWorkflows: ['.github/workflows/noisy.yml'], inProgress: false },
        gitHubToken: Buffer.from('token')
      } as any);
      mockOctokitInstance.rest.actions.listWorkflowRunsForRepo.mockResolvedValue({
        data: {
          total_count: 2,
          workflow_runs: [
            { created_at: recent, head_branch: 'main', id: 1, path: '.github/workflows/ci.yml' },
            { created_at: recent, head_branch: 'main', id: 2, path: '.github/workflows/noisy.yml' }
          ]
        }
      });

      const result = await handlers['git:api:getRuns']({}, 'proj-1');

      expect(result.runs.map((run: any) => run.id)).toEqual([1, 2]);
    });

    it('should fail when the repo cannot be resolved', async () => {
      mockGetRepoInfo.mockResolvedValue({});

      const result = await handlers['git:api:getRuns']({}, 'proj-1');

      expect(result).toEqual({ message: 'Project not found', success: false });
    });
  });

  describe('git:api:getJobs', () => {
    it('should return jobs for a workflow run', async () => {
      mockOctokitInstance.rest.actions.listJobsForWorkflowRun.mockResolvedValue({
        data: {
          jobs: [{ id: 1, name: 'build', status: 'completed' }]
        }
      });

      const result = await handlers['git:api:getJobs']({}, 'proj-1', 12345);

      expect(result.success).toBe(true);
      expect(result.jobs).toHaveLength(1);
    });

    it('should return error when repo info is not found', async () => {
      mockGetRepoInfo.mockResolvedValue({});

      const result = await handlers['git:api:getJobs']({}, 'proj-1', 12345);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Project not found');
    });

    it('should return error on API failure', async () => {
      mockOctokitInstance.rest.actions.listJobsForWorkflowRun.mockRejectedValue(new Error('API error'));

      const result = await handlers['git:api:getJobs']({}, 'proj-1', 12345);

      expect(result).toEqual({ message: 'API error', success: false });
    });
  });

  describe('git:api:getPulls', () => {
    it('should return pull requests', async () => {
      mockOctokitInstance.rest.search.issuesAndPullRequests.mockResolvedValue({
        data: {
          items: [{ id: 1, title: 'Fix bug' }]
        }
      });

      const result = await handlers['git:api:getPulls']({}, 'proj-1', 'author');

      expect(result.success).toBe(true);
      expect(result.pulls).toHaveLength(1);
    });

    it('should construct the correct search query', async () => {
      mockOctokitInstance.rest.search.issuesAndPullRequests.mockResolvedValue({
        data: { items: [] }
      });

      await handlers['git:api:getPulls']({}, 'proj-1', 'review-requested');

      expect(mockOctokitInstance.rest.search.issuesAndPullRequests).toHaveBeenCalledWith({
        q: 'repo:egor-xyz/devkitty is:open is:pr review-requested:@me archived:false'
      });
    });

    it('should return error when repo info is not found', async () => {
      mockGetRepoInfo.mockResolvedValue({});

      const result = await handlers['git:api:getPulls']({}, 'proj-1', 'author');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Project not found');
    });

    it('should return error on API failure', async () => {
      mockOctokitInstance.rest.search.issuesAndPullRequests.mockRejectedValue(new Error('Rate limited'));

      const result = await handlers['git:api:getPulls']({}, 'proj-1', 'author');

      expect(result).toEqual({ message: 'Rate limited', success: false });
    });
  });

  describe('git:api:getOpenPulls', () => {
    beforeEach(() => {
      mockGetRepoInfo.mockResolvedValue({ owner: 'owner', repo: 'repo' });
      mockSettings.get.mockReturnValue({ gitHubToken: Buffer.from('token') } as any);
    });

    it('should list pull requests with head refs, newest first', async () => {
      mockOctokitInstance.rest.pulls.list.mockResolvedValue({
        data: [
          { head: { ref: 'feature' }, id: 10, number: 42 },
          { head: { ref: 'fix' }, id: 11, number: 43 }
        ]
      });

      const result = await handlers['git:api:getOpenPulls']({}, 'proj-1');

      expect(mockOctokitInstance.rest.pulls.list).toHaveBeenCalledWith({
        direction: 'desc',
        owner: 'owner',
        per_page: 100,
        repo: 'repo',
        sort: 'updated',
        state: 'all'
      });
      expect(result).toEqual({
        pulls: [
          { head: { ref: 'feature' }, id: 10, number: 42 },
          { head: { ref: 'fix' }, id: 11, number: 43 }
        ],
        success: true
      });
    });

    it('should fail when the repo cannot be resolved', async () => {
      mockGetRepoInfo.mockResolvedValue({});

      const result = await handlers['git:api:getOpenPulls']({}, 'proj-1');

      expect(result).toEqual({ message: 'Project not found', success: false });
    });
  });

  describe('git:api:getPinnedRuns', () => {
    it('should fetch the latest run for each pinned workflow', async () => {
      mockSettings.get.mockReturnValue({
        gitHubActions: { pinnedWorkflows: ['.github/workflows/deploy.yml'] },
        gitHubToken: Buffer.from('token')
      } as any);
      mockOctokitInstance.rest.actions.listWorkflowRuns.mockResolvedValue({
        data: { workflow_runs: [{ id: 99 }] }
      });

      const result = await handlers['git:api:getPinnedRuns']({}, 'proj-1');

      expect(mockOctokitInstance.rest.actions.listWorkflowRuns).toHaveBeenCalledWith(
        expect.objectContaining({ per_page: 1, workflow_id: 'deploy.yml' })
      );
      expect(result).toEqual({ runs: [{ id: 99 }], success: true });
    });

    it('should skip the API entirely when nothing is pinned', async () => {
      mockSettings.get.mockReturnValue({
        gitHubActions: {},
        gitHubToken: Buffer.from('token')
      } as any);

      const result = await handlers['git:api:getPinnedRuns']({}, 'proj-1');

      expect(mockOctokitInstance.rest.actions.listWorkflowRuns).not.toHaveBeenCalled();
      expect(result).toEqual({ runs: [], success: true });
    });

    it('should return error when repo info is not found', async () => {
      mockSettings.get.mockReturnValue({
        gitHubActions: { pinnedWorkflows: ['.github/workflows/deploy.yml'] },
        gitHubToken: Buffer.from('token')
      } as any);
      mockGetRepoInfo.mockResolvedValue({});

      const result = await handlers['git:api:getPinnedRuns']({}, 'proj-1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Project not found');
    });
  });

  describe('git:api:searchRuns', () => {
    it('should return early with no runs for a blank query', async () => {
      const result = await handlers['git:api:searchRuns']({}, 'proj-1', '   ');

      expect(mockOctokitInstance.rest.actions.listRepoWorkflows).not.toHaveBeenCalled();
      expect(result).toEqual({ runs: [], success: true });
    });

    it('should find runs for workflows whose name matches every search term', async () => {
      mockOctokitInstance.rest.actions.listRepoWorkflows.mockResolvedValue({
        data: {
          workflows: [
            { id: 1, name: 'Deploy Production' },
            { id: 2, name: 'Run Tests' }
          ]
        }
      });
      mockOctokitInstance.rest.actions.listWorkflowRuns.mockResolvedValue({
        data: { workflow_runs: [{ id: 501 }] }
      });

      const result = await handlers['git:api:searchRuns']({}, 'proj-1', 'deploy prod');

      expect(mockOctokitInstance.rest.actions.listWorkflowRuns).toHaveBeenCalledWith(
        expect.objectContaining({ workflow_id: 1 })
      );
      expect(result).toEqual({ runs: [{ id: 501 }], success: true });
    });

    it('should return error when repo info is not found', async () => {
      mockGetRepoInfo.mockResolvedValue({});

      const result = await handlers['git:api:searchRuns']({}, 'proj-1', 'deploy');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Project not found');
    });
  });

  describe('git:api:cancelRun', () => {
    it('should cancel a workflow run', async () => {
      mockOctokitInstance.rest.actions.cancelWorkflowRun.mockResolvedValue({});

      const result = await handlers['git:api:cancelRun']({}, 'proj-1', 123);

      expect(mockOctokitInstance.rest.actions.cancelWorkflowRun).toHaveBeenCalledWith(
        expect.objectContaining({ run_id: 123 })
      );
      expect(result).toEqual({ success: true });
    });

    it('should return error on API failure', async () => {
      mockOctokitInstance.rest.actions.cancelWorkflowRun.mockRejectedValue(new Error('Cannot cancel'));

      const result = await handlers['git:api:cancelRun']({}, 'proj-1', 123);

      expect(result).toEqual({ message: 'Cannot cancel', success: false });
    });
  });

  describe('git:api:rerunWorkflow', () => {
    it('should rerun a workflow', async () => {
      mockOctokitInstance.rest.actions.reRunWorkflow.mockResolvedValue({});

      const result = await handlers['git:api:rerunWorkflow']({}, 'proj-1', 123);

      expect(mockOctokitInstance.rest.actions.reRunWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({ run_id: 123 })
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('git:api:rerunFailedJobs', () => {
    it('should rerun only the failed jobs of a workflow', async () => {
      mockOctokitInstance.rest.actions.reRunWorkflowFailedJobs.mockResolvedValue({});

      const result = await handlers['git:api:rerunFailedJobs']({}, 'proj-1', 123);

      expect(mockOctokitInstance.rest.actions.reRunWorkflowFailedJobs).toHaveBeenCalledWith(
        expect.objectContaining({ run_id: 123 })
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('git:api:getPRChecks', () => {
    const basePr = {
      base: { ref: 'main' },
      head: { sha: 'sha123' },
      mergeable: true,
      mergeable_state: 'clean',
      requested_reviewers: [],
      user: { login: 'author' }
    };

    const cleanGraphql = {
      repository: {
        autoMergeAllowed: true,
        mergeCommitAllowed: true,
        pullRequest: {
          autoMergeRequest: null,
          reviewThreads: { nodes: [] },
          viewerCanEnableAutoMerge: true
        },
        rebaseMergeAllowed: true,
        squashMergeAllowed: true
      }
    };

    beforeEach(() => {
      mockOctokitInstance.rest.checks.listForRef.mockResolvedValue({
        data: { check_runs: [{ conclusion: 'success', id: 1, name: 'build', status: 'completed' }] }
      });
      mockOctokitInstance.rest.pulls.listReviews.mockResolvedValue({ data: [] });
      mockOctokitInstance.graphql.mockResolvedValue(cleanGraphql);
      mockOctokitInstance.rest.repos.compareCommits.mockResolvedValue({ data: { behind_by: 0 } });
    });

    it('should report approved state and the allowed merge methods when everything is clean', async () => {
      mockOctokitInstance.rest.pulls.get.mockResolvedValue({
        data: {
          ...basePr,
          requested_reviewers: [{ avatar_url: 'pending.png', login: 'pending-reviewer' }]
        }
      });
      mockOctokitInstance.rest.pulls.listReviews.mockResolvedValue({
        data: [{ state: 'APPROVED', user: { avatar_url: 'a.png', login: 'reviewer-1' } }]
      });

      const result = await handlers['git:api:getPRChecks']({}, 'proj-1', 42);

      expect(result.success).toBe(true);
      expect(result.checks).toEqual([{ conclusion: 'success', id: 1, name: 'build', status: 'completed' }]);
      expect(result.review.state).toBe('approved');
      expect(result.review.approvedBy).toEqual(['reviewer-1']);
      expect(result.review.reviewers).toEqual(
        expect.arrayContaining([expect.objectContaining({ login: 'pending-reviewer', state: 'pending' })])
      );
      expect(result.allowedMergeMethods).toEqual(['squash', 'merge', 'rebase']);
      expect(result.autoMergeAllowed).toBe(true);
      expect(result.behind).toBe(false);
      expect(result.mergeable).toBe(true);
      expect(result.mergeableState).toBe('clean');
    });

    it('should report changes_requested as the overall state when any reviewer requests changes', async () => {
      mockOctokitInstance.rest.pulls.get.mockResolvedValue({ data: basePr });
      mockOctokitInstance.rest.pulls.listReviews.mockResolvedValue({
        data: [
          { state: 'APPROVED', user: { avatar_url: 'a.png', login: 'reviewer-1' } },
          { state: 'CHANGES_REQUESTED', user: { avatar_url: 'b.png', login: 'reviewer-2' } }
        ]
      });

      const result = await handlers['git:api:getPRChecks']({}, 'proj-1', 42);

      expect(result.review.state).toBe('changes_requested');
      expect(result.review.changesRequestedBy).toEqual(['reviewer-2']);
    });

    it('should exclude the PR author from the reviewer list', async () => {
      mockOctokitInstance.rest.pulls.get.mockResolvedValue({ data: basePr });
      mockOctokitInstance.rest.pulls.listReviews.mockResolvedValue({
        data: [{ state: 'COMMENTED', user: { avatar_url: 'a.png', login: 'author' } }]
      });

      const result = await handlers['git:api:getPRChecks']({}, 'proj-1', 42);

      expect(result.review.reviewers).toEqual([]);
    });

    it('should flag a re-requested reviewer and drop their stale approval from the approved count', async () => {
      mockOctokitInstance.rest.pulls.get.mockResolvedValue({
        data: {
          ...basePr,
          requested_reviewers: [{ avatar_url: 'a.png', login: 'reviewer-1' }]
        }
      });
      mockOctokitInstance.rest.pulls.listReviews.mockResolvedValue({
        data: [{ state: 'APPROVED', user: { avatar_url: 'a.png', login: 'reviewer-1' } }]
      });

      const result = await handlers['git:api:getPRChecks']({}, 'proj-1', 42);

      expect(result.review.approvedBy).toEqual([]);
      expect(result.review.state).toBe(null);
      expect(result.review.reviewers).toEqual(
        expect.arrayContaining([expect.objectContaining({ login: 'reviewer-1', reReviewRequested: true })])
      );
    });

    it('should still return checks and review data when the GraphQL query fails', async () => {
      mockOctokitInstance.rest.pulls.get.mockResolvedValue({ data: basePr });
      mockOctokitInstance.graphql.mockRejectedValue(new Error('GraphQL down'));

      const result = await handlers['git:api:getPRChecks']({}, 'proj-1', 42);

      expect(result.success).toBe(true);
      expect(result.unresolvedComments).toBe(0);
      expect(result.unresolvedThreads).toEqual([]);
      expect(result.autoMergeAllowed).toBe(false);
      expect(result.allowedMergeMethods).toEqual([]);
    });

    it('should surface unresolved review threads from GraphQL', async () => {
      mockOctokitInstance.rest.pulls.get.mockResolvedValue({ data: basePr });
      mockOctokitInstance.graphql.mockResolvedValue({
        repository: {
          ...cleanGraphql.repository,
          pullRequest: {
            ...cleanGraphql.repository.pullRequest,
            autoMergeRequest: { enabledAt: '2026-01-01T00:00:00Z' },
            reviewThreads: {
              nodes: [
                {
                  comments: {
                    nodes: [{ author: { avatarUrl: 'c.png', login: 'commenter' } }],
                    totalCount: 2
                  },
                  isResolved: false,
                  path: 'src/index.ts'
                },
                { comments: { nodes: [], totalCount: 0 }, isResolved: true, path: 'src/other.ts' }
              ]
            }
          }
        }
      });

      const result = await handlers['git:api:getPRChecks']({}, 'proj-1', 42);

      expect(result.unresolvedComments).toBe(1);
      expect(result.unresolvedThreads).toEqual([
        { avatarUrl: 'c.png', count: 2, login: 'commenter', path: 'src/index.ts' }
      ]);
      expect(result.autoMergeEnabled).toBe(true);
    });

    it('should treat the branch as not behind when comparing commits fails', async () => {
      mockOctokitInstance.rest.pulls.get.mockResolvedValue({ data: basePr });
      mockOctokitInstance.rest.repos.compareCommits.mockRejectedValue(new Error('comparison failed'));

      const result = await handlers['git:api:getPRChecks']({}, 'proj-1', 42);

      expect(result.success).toBe(true);
      expect(result.behind).toBe(false);
    });

    it('should report the branch as behind when compareCommits finds a positive behind_by', async () => {
      mockOctokitInstance.rest.pulls.get.mockResolvedValue({ data: basePr });
      mockOctokitInstance.rest.repos.compareCommits.mockResolvedValue({ data: { behind_by: 3 } });

      const result = await handlers['git:api:getPRChecks']({}, 'proj-1', 42);

      expect(result.behind).toBe(true);
    });

    it('should return error when repo info is not found', async () => {
      mockGetRepoInfo.mockResolvedValue({});

      const result = await handlers['git:api:getPRChecks']({}, 'proj-1', 42);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Project not found');
    });

    it('should return error when fetching the pull request fails', async () => {
      mockOctokitInstance.rest.pulls.get.mockRejectedValue(new Error('PR not found'));

      const result = await handlers['git:api:getPRChecks']({}, 'proj-1', 42);

      expect(result).toEqual({ message: 'PR not found', success: false });
    });
  });

  describe('git:api:mergePR', () => {
    it('should merge a pull request with the requested method', async () => {
      const result = await handlers['git:api:mergePR']({}, 'proj-1', 42, 'squash');

      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        ['pr', 'merge', '42', '--repo', 'egor-xyz/devkitty', '--squash'],
        expect.anything(),
        expect.any(Function)
      );
      expect(result).toEqual({ success: true });
    });

    it('should default to a merge commit when no method is recognized as squash or rebase', async () => {
      await handlers['git:api:mergePR']({}, 'proj-1', 42, 'merge');

      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        ['pr', 'merge', '42', '--repo', 'egor-xyz/devkitty', '--merge'],
        expect.anything(),
        expect.any(Function)
      );
    });

    it('should surface gh CLI failures as a plain-text message', async () => {
      mockExecFile.mockImplementation((_file: string, _args: string[], _options: unknown, callback: ExecFileCallback) => {
        callback({ stderr: 'X Pull request is not mergeable\n' });
      });

      const result = await handlers['git:api:mergePR']({}, 'proj-1', 42, 'squash');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Pull request is not mergeable');
    });

    it('should return error when repo info is not found', async () => {
      mockGetRepoInfo.mockResolvedValue({});

      const result = await handlers['git:api:mergePR']({}, 'proj-1', 42, 'squash');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Project not found');
    });
  });

  describe('git:api:updateBranch', () => {
    it('should update the branch with a merge commit by default', async () => {
      const result = await handlers['git:api:updateBranch']({}, 'proj-1', 42);

      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        ['pr', 'update-branch', '42', '--repo', 'egor-xyz/devkitty'],
        expect.anything(),
        expect.any(Function)
      );
      expect(result).toEqual({ success: true });
    });

    it('should add the rebase flag when rebase is requested', async () => {
      await handlers['git:api:updateBranch']({}, 'proj-1', 42, 'rebase');

      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        ['pr', 'update-branch', '42', '--repo', 'egor-xyz/devkitty', '--rebase'],
        expect.anything(),
        expect.any(Function)
      );
    });
  });

  describe('git:api:enableAutoMerge', () => {
    it('should arm auto-merge with the requested method', async () => {
      const result = await handlers['git:api:enableAutoMerge']({}, 'proj-1', 42, 'rebase');

      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        ['pr', 'merge', '42', '--repo', 'egor-xyz/devkitty', '--auto', '--rebase'],
        expect.anything(),
        expect.any(Function)
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('git:api:disableAutoMerge', () => {
    it('should disarm auto-merge for a pull request', async () => {
      const result = await handlers['git:api:disableAutoMerge']({}, 'proj-1', 42);

      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        ['pr', 'merge', '42', '--repo', 'egor-xyz/devkitty', '--disable-auto'],
        expect.anything(),
        expect.any(Function)
      );
      expect(result).toEqual({ success: true });
    });

    it('should return error when repo info is not found', async () => {
      mockGetRepoInfo.mockResolvedValue({});

      const result = await handlers['git:api:disableAutoMerge']({}, 'proj-1', 42);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Project not found');
    });
  });

  describe('git:api:getConflictFiles', () => {
    beforeEach(() => {
      mockOctokitInstance.rest.pulls.get.mockResolvedValue({
        data: { base: { ref: 'main' }, head: { ref: 'feature' } }
      });
    });

    it('should return an empty file list when the branches merge cleanly', async () => {
      const result = await handlers['git:api:getConflictFiles']({}, 'proj-1', 42);

      expect(mockGetProjectPath).toHaveBeenCalledWith('proj-1');
      expect(result).toEqual({ files: [], success: true });
    });

    it('should list the conflicting files reported by git merge-tree', async () => {
      mockExecFile
        .mockImplementationOnce(execFileSuccess)
        .mockImplementationOnce((_file: string, _args: string[], _options: unknown, callback: ExecFileCallback) => {
          callback({ stdout: 'abc123tree\nsrc/index.ts\nsrc/other.ts\n\ninfo about the conflict' });
        });

      const result = await handlers['git:api:getConflictFiles']({}, 'proj-1', 42);

      expect(result).toEqual({ files: ['src/index.ts', 'src/other.ts'], success: true });
    });

    it('should return error when repo info is not found', async () => {
      mockGetRepoInfo.mockResolvedValue({});

      const result = await handlers['git:api:getConflictFiles']({}, 'proj-1', 42);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Project not found');
    });

    it('should return error when fetching the base and head refs fails', async () => {
      mockExecFile.mockImplementation((_file: string, _args: string[], _options: unknown, callback: ExecFileCallback) => {
        callback(new Error('fetch failed'));
      });

      const result = await handlers['git:api:getConflictFiles']({}, 'proj-1', 42);

      expect(result).toEqual({ message: 'fetch failed', success: false });
    });
  });
});
