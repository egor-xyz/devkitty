// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

const longBranch = 'HERO-10251/this-is-a-very-long-focused-worktree-name-that-must-not-hide-the-navbar-icons';

vi.mock('renderer/hooks/useAIUsage', () => ({
  useAIUsage: (selector: (state: object) => unknown) => selector({
    accounts: [{ dir: '/test', provider: 'claude' }],
    detection: { claude: { installed: true }, codex: { installed: false }, cursor: { installed: true, surfaces: ['ide', 'cli'] } },
    discoveryErrors: {},
    init: vi.fn()
  })
}));
vi.mock('renderer/hooks/useAppSettings', () => ({
  useAppSettings: () => ({
    claudeEnabled: true,
    clipboardDownscale: false,
    set: vi.fn(),
    showClaudeUsage: true,
    showLogo: true
  }),
  useIsSunset: () => false
}));
vi.mock('renderer/hooks/useCommandPalette', () => ({
  useCommandPalette: (selector: (state: object) => unknown) => selector({ open: vi.fn() })
}));
vi.mock('renderer/hooks/useDarkMode', () => ({
  useDarkMode: () => ({ themeSource: 'light', toggleDarkMode: vi.fn() })
}));
vi.mock('renderer/hooks/useFilter', () => ({ useFilter: () => ({ clear: vi.fn() }) }));
vi.mock('renderer/hooks/useFocus', () => ({
  useFocus: () => ({
    clearFocus: vi.fn(),
    focusedProjectId: 'project-1',
    focusedWorktreePath: '/repo/worktrees/long'
  })
}));
vi.mock('renderer/hooks/useProjects', () => ({
  useProjects: () => ({ addProject: vi.fn(), projects: [{ id: 'project-1', name: 'repo' }] })
}));
vi.mock('renderer/hooks/useWorktrees', () => ({
  useWorktrees: (selector: (state: object) => unknown) => selector({
    byProject: {
      'project-1': [{ branch: longBranch, isMain: false, path: '/repo/worktrees/long', searchText: longBranch }]
    }
  })
}));
vi.mock('renderer/assets/devkitty.svg?react', () => ({
  default: ({ className }: { className?: string }) => (
    <svg
      aria-label="Devkitty logo"
      className={className}
    />
  )
}));
vi.mock('../ClaudeUsage', () => ({ ClaudeMark: () => <span data-testid="claude-mark" /> }));
vi.mock('../ShinyText', () => ({ ShinyText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('./AlwaysOnTopControl', () => ({
  AlwaysOnTopControl: () => <button aria-label="Toggle always on top" />
}));

import { AppNavbar } from './AppNavbar';

const expectClasses = (element: HTMLElement, ...classNames: string[]) => {
  classNames.forEach((className) => expect(element.classList.contains(className)).toBe(true));
};

describe('AppNavbar layout', () => {
  it('keeps a long focused name and every icon control on one stable row', () => {
    render(
      <MemoryRouter>
        <AppNavbar />
      </MemoryRouter>
    );

    const navbar = screen.getByTestId('app-navbar');
    const left = screen.getByTestId('app-navbar-left');
    const right = screen.getByTestId('app-navbar-right');
    const search = screen.getByTestId('app-navbar-search');
    const controls = screen.getByTestId('app-navbar-icon-controls');

    expectClasses(navbar, 'flex', 'flex-nowrap', 'overflow-hidden');
    expectClasses(left, 'shrink-0');
    expectClasses(right, 'ml-auto', 'min-w-0', 'flex-nowrap');
    expectClasses(search, 'min-w-0', 'shrink');
    expectClasses(controls, 'shrink-0');

    expect(screen.getByText(longBranch)).toBeTruthy();
    expect(right.querySelector('.bp6-icon-refresh')).toBeTruthy();
    expect(screen.getByTestId('claude-mark')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Toggle clipboard downscale' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Toggle always on top' })).toBeTruthy();
    expect(right.querySelector('.bp6-icon-contrast')).toBeTruthy();
    expect(right.querySelector('a[href="/settings"]')).toBeTruthy();
    expect(right.querySelector('.devkitty-logo')).toBeTruthy();
  });
});
