// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { useFilter } from 'renderer/hooks/useFilter';
import { useFocus } from 'renderer/hooks/useFocus';
import { type Pull } from 'types/gitHub';
import { type Worktree } from 'types/worktree';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  focusedMerged: true,
  getStatus: vi.fn(),
  openModal: vi.fn(),
  pull: vi.fn(),
  refresh: vi.fn()
}));
const storage = new Map<string, string>();

vi.mock('renderer/hooks/useGit', () => ({
  useGit: () => ({
    getStatus: mocks.getStatus,
    gitStatus: {
      organization: 'example',
      success: true,
      worktrees: [
        { branch: 'main', isMain: true, path: '/repo' },
        { branch: 'merged-focus', isMain: false, path: '/repo-focus' },
        { branch: 'merged-other', isMain: false, path: '/repo-other' }
      ]
    },
    loading: false,
    pull: mocks.pull
  })
}));
vi.mock('renderer/hooks/useModal', () => ({ useModal: () => ({ openModal: mocks.openModal }) }));
vi.mock('./hooks/useRepoData', () => ({
  useRepoData: () => {
    const focusedPull = mocks.focusedMerged
      ? { merged_at: '2026-09-01', state: 'closed' }
      : { merged_at: null, state: 'open' };

    return {
      clearHiddenPulls: vi.fn(),
      exhaustedHistory: new Set(),
      getOrphanPulls: () => [],
      getOrphanRuns: () => ({}),
      hiddenPullCount: 0,
      hiddenRunsByBranch: {},
      hidePull: vi.fn(),
      loadingHistory: null,
      loadOlderRuns: vi.fn(),
      pullsByBranch: {
        'merged-focus': [{ pull: focusedPull as Pull, tags: [] }],
        'merged-other': [{ pull: { merged_at: '2026-09-02', state: 'closed' } as Pull, tags: [] }]
      },
      refresh: mocks.refresh,
      runsByBranch: {},
      runsLoaded: true
    };
  }
}));
vi.mock('./components/CheckoutCard', () => ({
  CheckoutCard: ({ trailing, worktree }: { trailing?: ReactNode; worktree: Worktree }) => (
    <div data-testid={`worktree-${worktree.branch}`}>
      {worktree.branch}
      {trailing}
    </div>
  )
}));
vi.mock('./components/Error', () => ({ Error: () => null }));
vi.mock('./components/FoldDivider', () => ({ FoldDivider: () => null }));
vi.mock('./components/ProjectMenu', () => ({ ProjectMenu: () => null }));
vi.mock('./components/QuickActions', () => ({
  QuickActions: ({ toggleWorktrees }: { toggleWorktrees: () => void }) => (
    <button onClick={toggleWorktrees}>Toggle worktrees</button>
  )
}));

import { Project } from './Project';

describe('Project focused merged worktree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => storage.delete(key),
      setItem: (key: string, value: string) => storage.set(key, value)
    });
    mocks.focusedMerged = true;
    // Old stored values may still load, but they no longer control the view.
    useAppSettings.setState({ gitHubToken: 'token', ...{ showWorktrees: false } });
    useFilter.setState({ query: '' });
    useFocus.setState({ focusedProjectId: 'project-1', focusedWorktreePath: '/repo-focus' });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows only the focused merged worktree when this repo hides worktrees', () => {
    render(<Project project={{ filePath: '/repo', id: 'project-1', name: 'repo' }} />);

    expect(screen.getByTestId('worktree-merged-focus')).toBeTruthy();
    expect(screen.queryByTestId('worktree-merged-other')).toBeNull();
    expect(screen.queryByTestId('worktree-main')).toBeNull();
  });

  it('shows only the focused merged worktree while the merged fold is closed', () => {
    render(<Project project={{ filePath: '/repo', id: 'project-1', name: 'repo' }} />);

    expect(screen.getByTestId('worktree-merged-focus')).toBeTruthy();
    expect(screen.queryByTestId('worktree-merged-other')).toBeNull();
    expect(screen.queryByTestId('worktree-main')).toBeNull();
  });

  it('keeps the same focused card visible when its pull changes from open to merged', () => {
    mocks.focusedMerged = false;
    const { rerender } = render(<Project project={{ filePath: '/repo', id: 'project-1', name: 'repo' }} />);

    expect(screen.getByTestId('worktree-merged-focus')).toBeTruthy();

    mocks.focusedMerged = true;
    rerender(<Project project={{ filePath: '/repo', id: 'project-1', name: 'repo' }} />);

    expect(useFocus.getState().focusedWorktreePath).toBe('/repo-focus');
    expect(screen.getByTestId('worktree-merged-focus')).toBeTruthy();
    expect(screen.queryByTestId('worktree-merged-other')).toBeNull();
    expect(screen.queryByTestId('worktree-main')).toBeNull();
  });

  it('uses the normal repo view when the focused path is stale', () => {
    useFocus.setState({ focusedProjectId: 'project-1', focusedWorktreePath: '/missing' });

    render(<Project project={{ filePath: '/repo', id: 'project-1', name: 'repo' }} />);

    expect(screen.getByTestId('worktree-main')).toBeTruthy();
    expect(screen.queryByTestId('worktree-merged-focus')).toBeNull();
    expect(screen.queryByTestId('worktree-merged-other')).toBeNull();
  });

  it('does not apply another repo focus to this repo', () => {
    useFocus.setState({ focusedProjectId: 'project-2', focusedWorktreePath: '/repo-focus' });

    render(<Project project={{ filePath: '/repo', id: 'project-1', name: 'repo' }} />);

    expect(screen.getByTestId('worktree-main')).toBeTruthy();
    expect(screen.queryByTestId('worktree-merged-focus')).toBeNull();
    expect(screen.queryByTestId('worktree-merged-other')).toBeNull();
  });

  it('shows worktrees despite an old hidden setting, and keeps the per-repo toggle', () => {
    mocks.focusedMerged = false;
    useFocus.setState({ focusedProjectId: null, focusedWorktreePath: null });

    render(<Project project={{ filePath: '/repo', id: 'project-1', name: 'repo' }} />);

    expect(screen.getByTestId('worktree-merged-focus')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle worktrees' }));
    expect(screen.queryByTestId('worktree-merged-focus')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle worktrees' }));
    expect(screen.getByTestId('worktree-merged-focus')).toBeTruthy();
  });

  it('keeps an exact focused worktree visible when the text filter does not match it', () => {
    useFilter.setState({ query: 'no-match' });

    render(<Project project={{ filePath: '/repo', id: 'project-1', name: 'repo' }} />);

    expect(screen.getByTestId('worktree-merged-focus')).toBeTruthy();
    expect(screen.queryByTestId('worktree-merged-other')).toBeNull();
    expect(screen.queryByTestId('worktree-main')).toBeNull();
  });
});
