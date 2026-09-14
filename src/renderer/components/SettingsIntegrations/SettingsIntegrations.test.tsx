// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { type AppSettings } from 'types/appSettings';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ set: vi.fn(), settings: {} as Record<string, unknown>, show: vi.fn() }));
vi.mock('renderer/hooks/useAppSettings', () => ({ useAppSettings: () => ({
  claudeEnabled: true, editors: [] as AppSettings['editors'], gitHubToken: '',
  selectedEditor: undefined as AppSettings['selectedEditor'], selectedShell: undefined as AppSettings['selectedShell'],
  set: mocks.set, shells: [] as AppSettings['shells'], telemetry: true, ...mocks.settings
}) }));
vi.mock('renderer/utils/appToaster', () => ({ appToaster: Promise.resolve({ show: mocks.show }) }));

import { SettingsIntegrations } from './SettingsIntegrations';

describe('AI usage settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.settings = {};
  });

  it('shows provider usage controls without retired API cost controls', () => {
    render(<SettingsIntegrations />);
    expect(screen.getByText(/Claude Code, Codex, and Cursor/)).toBeDefined();
    expect(screen.getByRole('checkbox', { name: 'AI usage integration' })).toBeDefined();
    expect(screen.queryByText('Optional API cost reports')).toBeNull();
    expect(screen.queryByLabelText('Anthropic Admin API key')).toBeNull();
    expect(screen.queryByLabelText('OpenAI Admin API key')).toBeNull();
    expect(screen.queryByLabelText('Workspace ID (optional)')).toBeNull();
    expect(screen.queryByLabelText('Project ID (optional)')).toBeNull();
  });

  it('still changes the AI usage setting', () => {
    render(<SettingsIntegrations />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'AI usage integration' }));
    expect(mocks.set).toHaveBeenCalledWith({ claudeEnabled: false });
  });
});
