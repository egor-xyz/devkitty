import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { useCommandPalette } from 'renderer/hooks/useCommandPalette';
import { useDarkMode } from 'renderer/hooks/useDarkMode';
import { useFocus } from 'renderer/hooks/useFocus';
import { useProjects } from 'renderer/hooks/useProjects';
import { useWorktrees } from 'renderer/hooks/useWorktrees';
import { type ThemeSource } from 'types/Modal';

import { type CommandItem } from './types';

export const useCommands = (): CommandItem[] => {
  const isOpen = useCommandPalette((state) => state.isOpen);
  const {
    claudeEnabled,
    clipboardDownscale,
    editors,
    gitHubActions,
    selectedEditor,
    selectedShell,
    set,
    shells,
    showClaudeUsage,
    showLogo,
    showWorktrees,
    theme
  } = useAppSettings();
  const { setTheme, themeSource } = useDarkMode();
  const { projects } = useProjects();
  const { setFocus, setWorktreeFocus } = useFocus();
  const { byProject } = useWorktrees();
  const navigate = useNavigate();

  const appearanceThemeItems: CommandItem[] = [
    {
      active: theme === 'default',
      closeOnPerform: false,
      icon: 'style',
      id: 'appearance-theme-default',
      perform: () => set({ theme: 'default' }),
      section: 'Appearance',
      title: 'Theme: Default'
    },
    {
      active: theme === 'sunset',
      closeOnPerform: false,
      icon: 'style',
      id: 'appearance-theme-sunset',
      perform: () => set({ theme: 'sunset' }),
      section: 'Appearance',
      title: 'Theme: Sunset'
    }
  ];

  const appearanceSourceItems: CommandItem[] = (['system', 'light', 'dark'] as ThemeSource[]).map((source) => ({
    active: themeSource === source,
    closeOnPerform: false,
    icon: 'contrast',
    id: `appearance-source-${source}`,
    perform: () => setTheme(source),
    section: 'Appearance',
    title: `Appearance: ${source.charAt(0).toUpperCase()}${source.slice(1)}`
  }));

  const appearanceToggleItems: CommandItem[] = [
    {
      active: showWorktrees,
      closeOnPerform: false,
      icon: 'diagram-tree',
      id: 'appearance-toggle-show-worktrees',
      perform: () => set({ showWorktrees: !showWorktrees }),
      section: 'Appearance',
      title: 'Toggle Show worktrees'
    },
    {
      active: showLogo,
      closeOnPerform: false,
      icon: 'media',
      id: 'appearance-toggle-show-logo',
      perform: () => set({ showLogo: !showLogo }),
      section: 'Appearance',
      title: 'Toggle Show logo'
    }
  ];

  const integrationToggleItems: CommandItem[] = [
    {
      active: claudeEnabled,
      closeOnPerform: false,
      icon: 'code',
      id: 'integrations-toggle-claude-enabled',
      perform: () => set({ claudeEnabled: !claudeEnabled }),
      section: 'Integrations',
      title: 'Toggle Claude integration'
    },
    {
      active: showClaudeUsage,
      closeOnPerform: false,
      icon: 'timeline-bar-chart',
      id: 'integrations-toggle-claude-usage',
      perform: () => set({ showClaudeUsage: !showClaudeUsage }),
      section: 'Integrations',
      title: 'Toggle Claude usage footer'
    },
    {
      active: clipboardDownscale,
      closeOnPerform: false,
      icon: 'clipboard',
      id: 'integrations-toggle-clipboard-downscale',
      perform: () => set({ clipboardDownscale: !clipboardDownscale }),
      section: 'Integrations',
      title: 'Toggle Clipboard downscale'
    }
  ];

  const editorItems: CommandItem[] = editors.map((editor, index) => ({
    active: selectedEditor?.editor === editor.editor,
    closeOnPerform: false,
    icon: 'application',
    id: `integrations-select-editor-${editor.editor}-${index}`,
    perform: () => set({ selectedEditor: editor }),
    section: 'Integrations',
    title: `Select editor: ${editor.editor}`
  }));

  const shellItems: CommandItem[] = shells.map((shell, index) => ({
    active: selectedShell?.shell === shell.shell,
    closeOnPerform: false,
    icon: 'console',
    id: `integrations-select-shell-${shell.shell}-${index}`,
    perform: () => set({ selectedShell: shell }),
    section: 'Integrations',
    title: `Select shell: ${shell.shell}`
  }));

  const gitHubToggleItems: CommandItem[] = [
    {
      active: gitHubActions.notifications,
      closeOnPerform: false,
      icon: 'notifications',
      id: 'github-toggle-notifications',
      perform: () => set({ gitHubActions: { ...gitHubActions, notifications: !gitHubActions.notifications } }),
      section: 'GitHub',
      title: 'Toggle GitHub Actions notifications'
    },
    {
      active: gitHubActions.ignoreDependabot,
      closeOnPerform: false,
      icon: 'filter',
      id: 'github-toggle-ignore-dependabot',
      perform: () =>
        set({ gitHubActions: { ...gitHubActions, ignoreDependabot: !gitHubActions.ignoreDependabot } }),
      section: 'GitHub',
      title: 'Toggle Ignore Dependabot'
    }
  ];

  const gitHubNavigateItems: CommandItem[] = [
    {
      icon: 'numerical',
      id: 'github-navigate-actions-count',
      perform: () => navigate('/settings/github'),
      section: 'GitHub',
      title: 'Actions count…'
    },
    {
      icon: 'key',
      id: 'github-navigate-token',
      perform: () => navigate('/settings/integrations'),
      section: 'GitHub',
      title: 'GitHub token…'
    }
  ];

  const projectItems: CommandItem[] = projects.map((project) => ({
    icon: 'git-repo',
    id: `projects-focus-${project.id}`,
    keywords: `${project.name} ${project.filePath}`,
    perform: () => {
      setFocus(project.id);
      navigate('/');
    },
    section: 'Projects',
    subtitle: project.filePath,
    title: project.name
  }));

  const worktreeItems: CommandItem[] = projects.flatMap((project) =>
    (byProject[project.id] ?? []).map((worktree) => ({
      icon: 'git-branch' as const,
      id: `worktree-${project.id}-${worktree.path}`,
      keywords: worktree.searchText,
      perform: () => {
        setWorktreeFocus(project.id, worktree.path);
        navigate('/');
      },
      section: 'Worktrees' as const,
      subtitle: project.name,
      title: worktree.branch
    }))
  );

  const navigationItems: CommandItem[] = [
    {
      icon: 'cog',
      id: 'navigation-settings-appearance',
      perform: () => navigate('/settings/appearance'),
      section: 'Navigation',
      title: 'Open Settings › Appearance'
    },
    {
      icon: 'cog',
      id: 'navigation-settings-integrations',
      perform: () => navigate('/settings/integrations'),
      section: 'Navigation',
      title: 'Open Settings › Integrations'
    },
    {
      icon: 'cog',
      id: 'navigation-settings-github',
      perform: () => navigate('/settings/github'),
      section: 'Navigation',
      title: 'Open Settings › GitHub'
    }
  ];

  const items: CommandItem[] = isOpen
    ? [
        ...appearanceThemeItems,
        ...appearanceSourceItems,
        ...appearanceToggleItems,
        ...integrationToggleItems,
        ...editorItems,
        ...shellItems,
        ...gitHubToggleItems,
        ...gitHubNavigateItems,
        ...projectItems,
        ...worktreeItems,
        ...navigationItems
      ]
    : [];

  // Keep the array REFERENCE stable across renders that don't change what the
  // list shows. Background git polls tick the project/worktree stores every few
  // seconds, re-running this hook; a fresh array each time makes Blueprint's
  // QueryList reset its highlight to the first row (it re-filters whenever the
  // `items` prop identity changes), which snaps the keyboard selection back to
  // the top mid-navigation. Rebuild only when the visible content — ids, titles,
  // subtitles, and the active tick — actually changes.
  const signature = items
    .map((item) => `${item.id}:${item.active ? 1 : 0}:${item.title}:${item.subtitle ?? ''}`)
    .join('|');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => items, [signature]);
};
