// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
vi.mock('react-router', () => ({
  useNavigate: () => navigateMock
}));

import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { useCommandPalette } from 'renderer/hooks/useCommandPalette';
import { useFocus } from 'renderer/hooks/useFocus';
import { useProjects } from 'renderer/hooks/useProjects';
import { useWorktrees } from 'renderer/hooks/useWorktrees';

import { useCommands } from './useCommands';

describe('useCommands', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAppSettings.setState({
      claudeEnabled: true,
      clipboardDownscale: false,
      editors: [],
      gitHubActions: {
        all: true,
        count: 5,
        ignoreDependabot: false,
        ignoredWorkflows: [],
        notifications: true,
        pinnedWorkflows: []
      },
      selectedEditor: undefined,
      selectedShell: undefined,
      shells: [],
      showClaudeUsage: false,
      showLogo: true,
      showWorktrees: true,
      theme: 'sunset'
    });

    useProjects.setState({ projects: [] });
    useFocus.setState({ focusedProjectId: null, focusedWorktreePath: null });
    useWorktrees.setState({ byProject: {} });
    useCommandPalette.setState({ isOpen: true });
  });

  it('builds one Projects item per project with subtitle and keywords', () => {
    useProjects.setState({
      projects: [
        { filePath: '/path/a', id: '1', name: 'project-a' },
        { filePath: '/path/b', id: '2', name: 'project-b' }
      ]
    });

    const { result } = renderHook(() => useCommands());

    const projectItems = result.current.filter((item) => item.section === 'Projects');
    expect(projectItems).toHaveLength(2);
    expect(projectItems[0]).toMatchObject({
      keywords: 'project-a /path/a',
      subtitle: '/path/a',
      title: 'project-a'
    });
  });

  it('builds one Worktrees item per worktree with the project name as subtitle', () => {
    useProjects.setState({ projects: [{ filePath: '/path/a', id: '1', name: 'project-a' }] });
    useWorktrees.setState({
      byProject: {
        '1': [
          { branch: 'main', isMain: true, path: '/path/a', searchText: 'main' },
          {
            branch: 'HERO-10251/affected-entities-fallback',
            isMain: false,
            path: '/path/a-wt',
            searchText: 'HERO-10251/affected-entities-fallback Fix affected entities fallback'
          }
        ]
      }
    });

    const { result } = renderHook(() => useCommands());

    const worktreeItems = result.current.filter((item) => item.section === 'Worktrees');
    expect(worktreeItems).toHaveLength(2);
    expect(worktreeItems[1]).toMatchObject({
      keywords: 'HERO-10251/affected-entities-fallback Fix affected entities fallback',
      subtitle: 'project-a',
      title: 'HERO-10251/affected-entities-fallback'
    });
  });

  it('calls setWorktreeFocus and navigates home when a Worktrees item is performed', () => {
    useProjects.setState({ projects: [{ filePath: '/path/a', id: '1', name: 'project-a' }] });
    useWorktrees.setState({
      byProject: { '1': [{ branch: 'main', isMain: true, path: '/path/a', searchText: 'main' }] }
    });

    const { result } = renderHook(() => useCommands());

    const item = result.current.find((i) => i.id === 'worktree-1-/path/a');
    item?.perform();

    expect(useFocus.getState().focusedProjectId).toBe('1');
    expect(useFocus.getState().focusedWorktreePath).toBe('/path/a');
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('calls setFocus and navigates home when a Projects item is performed', () => {
    useProjects.setState({ projects: [{ filePath: '/path/a', id: '1', name: 'project-a' }] });

    const { result } = renderHook(() => useCommands());

    const item = result.current.find((i) => i.id === 'projects-focus-1');
    item?.perform();

    expect(useFocus.getState().focusedProjectId).toBe('1');
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('calls useAppSettings.set with the correct partial for a simple toggle', () => {
    const { result } = renderHook(() => useCommands());

    const item = result.current.find((i) => i.id === 'appearance-toggle-show-logo');
    item?.perform();

    expect(window.bridge.settings.set).toHaveBeenCalledWith('appSettings', { showLogo: false }, undefined);
  });

  it('spreads the whole gitHubActions object when toggling a nested field', () => {
    const { result } = renderHook(() => useCommands());

    const item = result.current.find((i) => i.id === 'github-toggle-notifications');
    item?.perform();

    expect(window.bridge.settings.set).toHaveBeenCalledWith(
      'appSettings',
      {
        gitHubActions: {
          all: true,
          count: 5,
          ignoreDependabot: false,
          ignoredWorkflows: [],
          notifications: false,
          pinnedWorkflows: []
        }
      },
      undefined
    );
  });

  it('does not clobber sibling gitHubActions fields when toggling ignoreDependabot', () => {
    const { result } = renderHook(() => useCommands());

    const item = result.current.find((i) => i.id === 'github-toggle-ignore-dependabot');
    item?.perform();

    expect(window.bridge.settings.set).toHaveBeenCalledWith(
      'appSettings',
      expect.objectContaining({
        gitHubActions: expect.objectContaining({ ignoreDependabot: true, notifications: true })
      }),
      undefined
    );
  });

  it('calls navigate for navigate items', () => {
    const { result } = renderHook(() => useCommands());

    const tokenItem = result.current.find((i) => i.id === 'github-navigate-token');
    tokenItem?.perform();
    expect(navigateMock).toHaveBeenCalledWith('/settings/integrations');

    const countItem = result.current.find((i) => i.id === 'github-navigate-actions-count');
    countItem?.perform();
    expect(navigateMock).toHaveBeenCalledWith('/settings/github');

    const navItem = result.current.find((i) => i.id === 'navigation-settings-appearance');
    navItem?.perform();
    expect(navigateMock).toHaveBeenCalledWith('/settings/appearance');
  });

  it('omits editor and shell items when none are configured', () => {
    const { result } = renderHook(() => useCommands());

    expect(result.current.some((item) => item.id.startsWith('integrations-select-editor-'))).toBe(false);
    expect(result.current.some((item) => item.id.startsWith('integrations-select-shell-'))).toBe(false);
  });

  it('builds a select item per editor and shell', () => {
    useAppSettings.setState({
      editors: [{ editor: 'VS Code', path: '/usr/bin/code' }],
      shells: [{ path: '/bin/zsh', shell: 'zsh' }]
    });

    const { result } = renderHook(() => useCommands());

    const editorItem = result.current.find((i) => i.id === 'integrations-select-editor-VS Code-0');
    expect(editorItem).toBeDefined();

    editorItem?.perform();
    expect(window.bridge.settings.set).toHaveBeenCalledWith(
      'appSettings',
      { selectedEditor: { editor: 'VS Code', path: '/usr/bin/code' } },
      undefined
    );

    const shellItem = result.current.find((i) => i.id === 'integrations-select-shell-zsh-0');
    expect(shellItem).toBeDefined();
  });
});
