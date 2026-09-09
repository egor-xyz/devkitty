// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { type AIAccount, type AIUsage } from 'types/aiUsage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ pathname: '/', setActive: vi.fn(), setProvider: vi.fn(), state: {} as Record<string, unknown> }));
vi.mock('react-router', () => ({ useLocation: () => ({ pathname: mocks.pathname }) }));
vi.mock('renderer/hooks/useAppSettings', () => ({ useAppSettings: () => ({ claudeEnabled: true, showClaudeUsage: true }), useIsSunset: () => false }));
vi.mock('renderer/hooks/useAIUsage', () => ({
  AI_PROVIDERS: ['claude', 'codex'], aiAccountKey: (account: AIAccount) => `${account.provider}:${account.dir}`, useAIUsage: () => mocks.state
}));
vi.mock('@number-flow/react', () => ({ default: ({ suffix, value }: { suffix?: string; value: number }) => <span>{value}{suffix}</span> }));
vi.mock('@blueprintjs/core', () => ({
  Icon: (): null => null,
  Popover: ({ children, content }: { children: ReactNode; content: ReactNode }) => <div>{children}{content}</div>,
  Tooltip: ({ children }: { children: ReactNode }) => children
}));

import { ClaudeFooter } from './ClaudeFooter';

const claude: AIAccount = { dir: '/claude', label: 'Claude main', provider: 'claude' };
const codex: AIAccount = { dir: '/codex', label: 'Codex main', provider: 'codex' };
const usage = (account: AIAccount): AIUsage => {
  const window: AIUsage['fiveHour'] = { active: true, cap: 0, models: [], pct: 0.25, reported: true, resetsAt: Date.now() + 3600000, startsAt: Date.now(), tokens: 1000 };
  return { account, computedAt: Date.now(), fiveHour: window, reportedAt: Date.now() - 60000, week: window };
};

describe('AI Analytics footer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pathname = '/';
    vi.stubGlobal('ResizeObserver', class { disconnect() {} observe() {} });
    mocks.state = {
      accounts: [claude, { ...claude, dir: '/claude-2', label: 'Claude work' }, codex, { ...codex, dir: '/codex-2', label: 'Codex work' }],
      activeDirs: { claude: claude.dir, codex: codex.dir }, activeProvider: 'claude', detection: { claude: { installed: true }, codex: { installed: true } },
      discoveryErrors: {}, errorByAccount: {}, init: vi.fn(), loadingByAccount: {}, setActive: mocks.setActive, setProvider: mocks.setProvider,
      usageByAccount: { 'claude:/claude': usage(claude), 'codex:/codex': usage(codex) }
    };
  });

  it('uses icon buttons to switch immediately to cached provider usage', () => {
    const { rerender } = render(<ClaudeFooter />);
    expect(screen.queryByRole('button', { name: 'Both' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Show Claude usage' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Show Claude usage' }).getAttribute('title')).toBe('Claude');
    expect(screen.getByRole('button', { name: 'Claude account 1: Claude main' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('button', { name: /Codex account/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show Codex usage' }));
    expect(mocks.setProvider).toHaveBeenCalledWith('codex');
    mocks.state.activeProvider = 'codex';
    rerender(<ClaudeFooter />);
    expect(screen.getByRole('button', { name: /Codex · 7D usage/ })).toBeDefined();
    expect(screen.queryByText('Reading usage…')).toBeNull();
    expect(screen.getByRole('contentinfo').className).toContain('h-11');
  });

  it('shows only weekly Codex usage, with no five-hour meter', () => {
    const codexUsage = usage(codex);
    codexUsage.week = { ...codexUsage.week, cap: 0, durationMs: 7 * 24 * 3600000, reported: false };
    mocks.state.activeProvider = 'codex';
    mocks.state.usageByAccount = { 'codex:/codex': codexUsage };
    render(<ClaudeFooter />);
    expect(screen.getByRole('button', { name: /Codex · 7D usage: 1.0K tokens, quota unavailable/ })).toBeDefined();
    expect(screen.getByText('— · 1.0K tokens')).toBeDefined();
    expect(screen.queryByRole('button', { name: /Codex · 5H usage/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Claude account/ })).toBeNull();
  });

  it('shows empty state without a footer refresh and hides controls on Settings', () => {
    mocks.state.accounts = [];
    mocks.state.usageByAccount = {};
    const { rerender } = render(<ClaudeFooter />);
    expect(screen.getByText('No Claude accounts found.')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Rescan AI accounts' })).toBeNull();
    mocks.pathname = '/settings/integrations';
    rerender(<ClaudeFooter />);
    expect(screen.queryByRole('contentinfo')).toBeNull();
    expect(screen.getByRole('contentinfo', { hidden: true }).hasAttribute('inert')).toBe(true);
  });
});
