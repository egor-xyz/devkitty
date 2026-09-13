// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ set: vi.fn(), settings: {} as Record<string, unknown>, show: vi.fn() }));
vi.mock('renderer/hooks/useAppSettings', () => ({ useAppSettings: () => ({
  anthropicUsageWorkspaceId: '', claudeEnabled: true, editors: [], gitHubToken: '', openAIUsageProjectId: '',
  selectedEditor: undefined, selectedShell: undefined, set: mocks.set, shells: [], telemetry: true, ...mocks.settings
}) }));
vi.mock('renderer/utils/appToaster', () => ({ appToaster: Promise.resolve({ show: mocks.show }) }));

import { SettingsIntegrations } from './SettingsIntegrations';

describe('AI usage settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.settings = {};
    vi.mocked(window.bridge.aiUsageCredentials.status).mockResolvedValue({ anthropic: false, openai: false });
  });

  it('explains the three providers and stores only admin-key status in the renderer', async () => {
    render(<SettingsIntegrations />);
    expect(screen.getByText(/Claude Code, Codex, and Cursor/)).toBeDefined();
    expect(screen.getByText(/high access/)).toBeDefined();
    fireEvent.change(screen.getByLabelText('OpenAI Admin API key'), { target: { value: 'sk-admin-secret' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[1]);
    await vi.waitFor(() => {
      expect(window.bridge.aiUsageCredentials.set).toHaveBeenCalledWith('openai', 'sk-admin-secret');
      expect((screen.getByLabelText('OpenAI Admin API key') as HTMLInputElement).value).toBe('');
    });
  });

  it('shows and uses clear buttons for saved keys', async () => {
    vi.mocked(window.bridge.aiUsageCredentials.status).mockResolvedValue({ anthropic: true, openai: true });
    render(<SettingsIntegrations />);
    await vi.waitFor(() => expect(screen.getAllByRole('button', { name: 'Clear' })).toHaveLength(2));
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear' })[0]);
    expect(window.bridge.aiUsageCredentials.clear).toHaveBeenCalledWith('anthropic');
  });

  it('saves optional report scope IDs as normal settings', () => {
    render(<SettingsIntegrations />);
    fireEvent.change(screen.getByLabelText('Workspace ID (optional)'), { target: { value: 'wrk_123' } });
    fireEvent.change(screen.getByLabelText('Project ID (optional)'), { target: { value: 'proj_123' } });
    expect(mocks.set).toHaveBeenCalledWith({ anthropicUsageWorkspaceId: 'wrk_123' });
    expect(mocks.set).toHaveBeenCalledWith({ openAIUsageProjectId: 'proj_123' });
  });
});
