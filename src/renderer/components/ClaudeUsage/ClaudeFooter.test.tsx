// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { type AIAccount, type AIUsage } from 'types/aiUsage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ pathname: '/', setActive: vi.fn(), setProvider: vi.fn(), state: {} as Record<string, unknown> }));
vi.mock('react-router', () => ({ useLocation: () => ({ pathname: mocks.pathname }) }));
vi.mock('renderer/hooks/useAppSettings', () => ({ useAppSettings: () => ({ claudeEnabled: true, showClaudeUsage: true }), useIsSunset: () => false }));
vi.mock('renderer/hooks/useAIUsage', () => ({
  AI_PROVIDER_CONFIG: { claude: { name: 'Claude' }, codex: { name: 'Codex' }, cursor: { name: 'Cursor' } },
  AI_PROVIDERS: ['claude', 'codex', 'cursor'], aiAccountKey: (account: AIAccount) => `${account.provider}:${account.dir}`, useAIUsage: () => mocks.state
}));
vi.mock('@blueprintjs/core', () => ({
  Icon: (): null => null,
  Popover: ({ children, content }: { children: ReactNode; content: ReactNode }) => <div>{children}{content}</div>,
  Tooltip: ({ children }: { children: ReactNode }) => children
}));

import { ClaudeFooter } from './ClaudeFooter';

const claude: AIAccount = { dir: '/claude', label: 'Claude main', provider: 'claude' };
const codex: AIAccount = { dir: '/codex', label: 'Codex main', provider: 'codex' };
const cursor: AIAccount = { dir: '/cursor', label: 'Cursor', provider: 'cursor', surfaces: ['ide', 'cli', 'grok-bot'] };
const usage = (account: AIAccount): AIUsage => ({ account, computedAt: Date.now(), metrics: [{ id: 'seven-day', label: '7D', percent: 0.25, resetsAt: Date.now() + 3600000, scope: 'account', source: 'provider', title: '7D', tokens: 1000 }], reportedAt: Date.now() - 60000 });

describe('AI Analytics footer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pathname = '/';
    vi.stubGlobal('ResizeObserver', class { disconnect() {} observe() {} });
    mocks.state = {
      accounts: [claude, { ...claude, dir: '/claude-2', label: 'Claude work' }, codex, cursor],
      activeDirs: { claude: claude.dir, codex: codex.dir, cursor: cursor.dir }, activeProvider: 'claude',
      detection: { claude: { installed: true }, codex: { installed: true }, cursor: { installed: true } },
      discoveryErrors: {}, errorByAccount: {}, loadingByAccount: {}, setActive: mocks.setActive, setProvider: mocks.setProvider,
      usageByAccount: { 'claude:/claude': usage(claude), 'codex:/codex': usage(codex), 'cursor:/cursor': usage(cursor) }
    };
  });

  it('switches among three providers and keeps the footer at 44 pixels', () => {
    const { rerender } = render(<ClaudeFooter />);
    expect(screen.getByRole('button', { name: 'Show Claude usage' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Show Cursor usage' }));
    expect(mocks.setProvider).toHaveBeenCalledWith('cursor');
    mocks.state.activeProvider = 'cursor';
    rerender(<ClaudeFooter />);
    expect(screen.getByRole('button', { name: /7D: 25% of current quota period/ })).toBeDefined();
    expect(screen.getByRole('contentinfo').className).toContain('h-11');
  });

  it('uses the official Cursor SVG mark and shows its key hint', () => {
    render(<ClaudeFooter />);
    const button = screen.getByRole('button', { name: 'Show Cursor usage' });
    expect(button.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 466.73 532.09');
    expect(button.textContent).toBe('');
    expect(button.getAttribute('aria-keyshortcuts')).toBe('Meta+3');
    expect(button.getAttribute('title')).toBe('Cursor · ⌘3');
  });

  it('maps exact Command number keys to providers', () => {
    render(<ClaudeFooter />);
    for (const [code, provider] of [['Digit1', 'claude'], ['Digit2', 'codex'], ['Digit3', 'cursor']] as const) {
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, code, metaKey: true });
      document.body.dispatchEvent(event);
      expect(mocks.setProvider).toHaveBeenLastCalledWith(provider);
      expect(event.defaultPrevented).toBe(true);
    }
    expect(screen.getByRole('button', { name: 'Show Claude usage' }).getAttribute('aria-keyshortcuts')).toBe('Meta+1');
    expect(screen.getByRole('button', { name: 'Show Codex usage' }).getAttribute('aria-keyshortcuts')).toBe('Meta+2');
  });

  it('ignores other modifiers, repeats, plain numbers, and editable targets', () => {
    const { container } = render(<ClaudeFooter />);
    for (const options of [
      { code: 'Digit1' }, { code: 'Digit1', ctrlKey: true, metaKey: true }, { altKey: true, code: 'Digit1', metaKey: true },
      { code: 'Digit1', metaKey: true, shiftKey: true }, { code: 'Digit1', metaKey: true, repeat: true }
    ]) fireEvent.keyDown(document.body, options);
    for (const element of [document.createElement('input'), document.createElement('textarea'), document.createElement('select')]) {
      container.append(element);
      fireEvent.keyDown(element, { code: 'Digit1', metaKey: true });
    }
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    container.append(editable);
    fireEvent.keyDown(editable, { code: 'Digit1', metaKey: true });
    const textbox = document.createElement('div');
    textbox.setAttribute('role', 'textbox');
    container.append(textbox);
    fireEvent.keyDown(textbox, { code: 'Digit1', metaKey: true });
    expect(mocks.setProvider).not.toHaveBeenCalled();
  });

  it('does not handle provider keys while hidden or on Settings', () => {
    mocks.pathname = '/settings/integrations';
    render(<ClaudeFooter />);
    fireEvent.keyDown(document.body, { code: 'Digit2', metaKey: true });
    expect(mocks.setProvider).not.toHaveBeenCalled();
  });

  it('keeps spend compact and gives quota meters the free width', () => {
    mocks.state.activeProvider = 'cursor';
    mocks.state.usageByAccount = { 'cursor:/cursor': { ...usage(cursor), spend: { amountUsdMicros: 1_000_000, label: 'On-demand', period: 'billing-cycle', scope: 'account', source: 'provider' } } };
    render(<ClaudeFooter />);
    expect(screen.getByTestId('usage-meter-row').className).toContain('flex-1');
    expect(screen.getByTestId('quota-meter-slot').className).toContain('basis-0');
    expect(screen.getByTestId('quota-meter-slot').className).toContain('flex-1');
    expect(screen.getByTestId('spend-meter-slot').className).toContain('shrink-0');
    expect(screen.getByTestId('spend-meter-slot').className).not.toContain('flex-1');
  });

  it('shows only 7D for Codex', () => {
    mocks.state.activeProvider = 'codex';
    render(<ClaudeFooter />);
    expect(screen.getByRole('button', { name: /7D: 25%/ })).toBeDefined();
    expect(screen.queryByText('5H')).toBeNull();
  });

  it('shows Grok as unavailable instead of inventing weekly use', () => {
    mocks.state.activeProvider = 'cursor';
    mocks.state.accounts = [claude, codex, { ...cursor, surfaces: ['ide'] }];
    mocks.state.detection = { claude: { installed: true }, codex: { installed: true }, cursor: { installed: true, surfaces: ['cli', 'grok-bot'] } };
    render(<ClaudeFooter />);
    expect(screen.getByText('Used by Cursor IDE and CLI. Grok Bot installed · usage unavailable')).toBeDefined();
  });

  it('keeps the last good value visible with a read error', () => {
    mocks.state.activeProvider = 'codex';
    mocks.state.errorByAccount = { 'codex:/codex': 'Temporary read error' };
    render(<ClaudeFooter />);
    expect(screen.getByRole('button', { name: /7D: 25%/ })).toBeDefined();
    expect(screen.getByRole('status').textContent).toContain('Temporary read error');
  });

  it('hides controls on Settings', () => {
    mocks.pathname = '/settings/integrations';
    render(<ClaudeFooter />);
    expect(screen.getByRole('contentinfo', { hidden: true }).hasAttribute('inert')).toBe(true);
  });
});
