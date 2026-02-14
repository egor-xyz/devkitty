import { describe, it, expect, vi, beforeEach } from 'vitest';

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
    error: vi.fn()
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

  describe('git:api:getAction', () => {
    it('should return workflow runs filtered by branch', async () => {
      const now = Date.now();
      const recentDate = new Date(now - 1000).toISOString();

      mockOctokitInstance.rest.actions.listWorkflowRunsForRepo.mockResolvedValue({
        data: {
          total_count: 1,
          workflow_runs: [
            {
              created_at: recentDate,
              head_branch: 'main',
              name: 'CI',
              status: 'completed'
            }
          ]
        }
      });

      const result = await handlers['git:api:getAction']({}, 'proj-1', ['main']);

      expect(result.success).toBe(true);
      expect(result.runs).toHaveLength(1);
    });

    it('should return message when no runs exist', async () => {
      mockOctokitInstance.rest.actions.listWorkflowRunsForRepo.mockResolvedValue({
        data: { total_count: 0, workflow_runs: [] }
      });

      const result = await handlers['git:api:getAction']({}, 'proj-1', ['main']);

      expect(result).toEqual({ message: 'No running actions', success: true });
    });

    it('should filter out runs older than 24 hours', async () => {
      const oldDate = new Date(Date.now() - 100000000).toISOString(); // > 24h ago

      mockOctokitInstance.rest.actions.listWorkflowRunsForRepo.mockResolvedValue({
        data: {
          total_count: 1,
          workflow_runs: [
            { created_at: oldDate, head_branch: 'main', name: 'CI', status: 'completed' }
          ]
        }
      });

      const result = await handlers['git:api:getAction']({}, 'proj-1', ['main']);

      expect(result.success).toBe(false);
      expect(result.message).toBe('No actions for this branch');
    });

    it('should limit runs by count setting', async () => {
      const now = Date.now();
      const recentDate = new Date(now - 1000).toISOString();

      mockSettings.get.mockReturnValue({
        gitHubActions: { all: true, count: 2, inProgress: false },
        gitHubToken: Buffer.from('token')
      } as any);

      mockOctokitInstance.rest.actions.listWorkflowRunsForRepo.mockResolvedValue({
        data: {
          total_count: 5,
          workflow_runs: Array(5)
            .fill(null)
            .map((_, i) => ({
              created_at: recentDate,
              head_branch: 'main',
              name: `CI-${i}`,
              status: 'completed'
            }))
        }
      });

      const result = await handlers['git:api:getAction']({}, 'proj-1', ['main']);

      expect(result.runs).toHaveLength(2);
    });

    it('should return error on API failure', async () => {
      mockOctokitInstance.rest.actions.listWorkflowRunsForRepo.mockRejectedValue(new Error('API error'));

      const result = await handlers['git:api:getAction']({}, 'proj-1', ['main']);

      expect(result).toEqual({ message: 'API error', success: false });
    });

    it('should filter by inProgress when setting is enabled', async () => {
      const now = Date.now();
      const recentDate = new Date(now - 1000).toISOString();
      const olderDate = new Date(now - 3600000).toISOString(); // 1h ago (> 30min)

      mockSettings.get.mockReturnValue({
        gitHubActions: { all: true, count: 10, inProgress: true },
        gitHubToken: Buffer.from('token')
      } as any);

      mockOctokitInstance.rest.actions.listWorkflowRunsForRepo.mockResolvedValue({
        data: {
          total_count: 2,
          workflow_runs: [
            { created_at: recentDate, head_branch: 'main', name: 'CI-1', status: 'in_progress' },
            { created_at: olderDate, head_branch: 'main', name: 'CI-2', status: 'completed' }
          ]
        }
      });

      const result = await handlers['git:api:getAction']({}, 'proj-1', ['main']);

      // The in_progress run should pass, the completed old one should be filtered
      expect(result.runs).toHaveLength(1);
      expect(result.runs[0].status).toBe('in_progress');
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
});
