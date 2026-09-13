// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { type UpdateState } from 'types/update';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const longBranch = 'HERO-10251/this-is-a-very-long-focused-worktree-name-that-must-not-hide-the-navbar-icons';
let isSunsetTheme = false;

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
  useIsSunset: () => isSunsetTheme
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

let onUpdateState: ((state: UpdateState) => void) | undefined;
const getUpdateState = vi.fn<() => Promise<UpdateState>>();
const downloadUpdate = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
const installUpdate = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

beforeEach(() => {
  isSunsetTheme = false;
  onUpdateState = undefined;
  getUpdateState.mockReset().mockResolvedValue({ status: 'idle' });
  downloadUpdate.mockReset().mockResolvedValue(undefined);
  installUpdate.mockReset().mockResolvedValue(undefined);
  window.bridge.updater = {
    download: downloadUpdate,
    getState: getUpdateState,
    install: installUpdate,
    onState: vi.fn((callback: (state: UpdateState) => void) => {
      onUpdateState = callback;
      return () => { onUpdateState = undefined; };
    })
  };
});

const renderNavbar = () => render(<MemoryRouter><AppNavbar /></MemoryRouter>);

const emitUpdateState = (state: UpdateState) => {
  act(() => onUpdateState?.(state));
};

const expectClasses = (element: HTMLElement, ...classNames: string[]) => {
  classNames.forEach((className) => expect(element.classList.contains(className)).toBe(true));
};

describe('AppNavbar layout', () => {
  it('keeps a long focused name and every icon control on one stable row', async () => {
    await act(async () => { renderNavbar(); });

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

  it('hides the update action until an update is available', async () => {
    renderNavbar();

    expect(screen.queryByRole('button', { name: 'Update' })).toBeNull();
    emitUpdateState({ status: 'available', version: '4.5.0' });

    const button = await screen.findByRole('button', { name: 'Update' });
    expect(button).toBeTruthy();
    fireEvent.click(button);
    expect(downloadUpdate).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Downloading update' }).hasAttribute('disabled')).toBe(true);
  });

  it('shows a disabled download state, then lets the user restart', async () => {
    getUpdateState.mockResolvedValue({ status: 'downloading', version: '4.5.0' });
    renderNavbar();

    const downloading = await screen.findByRole('button', { name: 'Downloading update' });
    expect(downloading.hasAttribute('disabled')).toBe(true);
    expect(downloadUpdate).not.toHaveBeenCalled();

    emitUpdateState({ status: 'ready', version: '4.5.0' });
    fireEvent.click(screen.getByRole('button', { name: 'Restart to update' }));
    expect(installUpdate).toHaveBeenCalledOnce();
  });

  it('shows an error and lets the user retry', async () => {
    getUpdateState.mockResolvedValue({ error: 'Network unavailable', status: 'error', version: '4.5.0' });
    renderNavbar();

    const button = await screen.findByRole('button', { name: 'Retry update' });
    expect(button.getAttribute('title')).toBe('Network unavailable');
    fireEvent.click(button);
    expect(downloadUpdate).toHaveBeenCalledOnce();
  });

  it('hides an update-check error when no update is known', async () => {
    getUpdateState.mockResolvedValue({ error: 'Network unavailable', status: 'error' });
    await act(async () => { renderNavbar(); });

    expect(screen.queryByRole('button', { name: 'Retry update' })).toBeNull();
    expect(downloadUpdate).not.toHaveBeenCalled();
  });

  it('keeps Retry update visible after a download call fails', async () => {
    getUpdateState.mockResolvedValue({ status: 'available', version: '4.5.0' });
    downloadUpdate.mockRejectedValueOnce(new Error('Download failed'));
    renderNavbar();

    fireEvent.click(await screen.findByRole('button', { name: 'Update' }));
    const retry = await screen.findByRole('button', { name: 'Retry update' });
    expect(retry.getAttribute('title')).toContain('Download failed');
    fireEvent.click(retry);
    expect(downloadUpdate).toHaveBeenCalledTimes(2);
  });

  it('uses each style theme for the update action', async () => {
    getUpdateState.mockResolvedValue({ status: 'available' });
    const defaultView = renderNavbar();
    const defaultButton = await screen.findByRole('button', { name: 'Update' });
    expect(defaultButton.className).toContain('text-bp-blue-2');
    defaultView.unmount();

    isSunsetTheme = true;
    renderNavbar();
    const sunsetButton = await screen.findByRole('button', { name: 'Update' });
    expect(sunsetButton.className).toContain('!text-[#F5854A]');
  });
});
