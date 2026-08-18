import { beforeEach, describe, expect, it, vi } from 'vitest';

const handlers: Record<string, (...args: any[]) => any> = {};

const mockOctokitInstance = {
  rest: {
    actions: {
      listJobsForWorkflowRun: vi.fn(),
      listWorkflowRunsForRepo: vi.fn()
    },
    git: {
      getRef: vi.fn(),
      updateRef: vi.fn()
    },
    pulls: {
      get: vi.fn(),
      list: vi.fn()
    },
    search: {
      issuesAndPullRequests: vi.fn()
    }
  }
};

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
    rest = mockOctokitInstance.rest;
  }
}));

vi.mock('../libs/git', () => ({
  getRepoInfo: vi.fn()
}));

vi.mock('../settings', () => ({
  settings: {
    get: vi.fn()
  }
}));

import { getRepoInfo } from '../libs/git';
import { settings } from '../settings';

await import('./ipcGitHub');

const mockSettings = vi.mocked(settings);
const mockGetRepoInfo = vi.mocked(getRepoInfo);

describe('ipcGitHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings.get.mockReturnValue({
      gitHubActions: { all: true, count: 3, inProgress: false },
      gitHubToken: Buffer.from('encrypted-token')
    } as any);
    mockGetRepoInfo.mockResolvedValue({ owner: 'egor-xyz', repo: 'devkitty' });
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
});
