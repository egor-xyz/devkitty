import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (...args: unknown[]) => unknown;
const handlers: Record<string, Handler> = {};
vi.mock('electron', () => ({ ipcMain: { handle: vi.fn((channel: string, handler: Handler) => { handlers[channel] = handler; }) } }));
vi.mock('../libs/aiUsage/secrets', () => ({
  aiUsageSecrets: { clear: vi.fn(), set: vi.fn(), status: vi.fn(() => ({ anthropic: true, openai: false })) }
}));

import { aiUsageSecrets } from '../libs/aiUsage/secrets';

await import('./ipcAIUsageCredentials');

describe('AI usage credential IPC', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns only saved status', () => {
    expect(handlers['aiUsageCredentials:status']({})).toEqual({ anthropic: true, openai: false });
  });

  it('trims and saves an allowed provider key', () => {
    handlers['aiUsageCredentials:set']({}, 'openai', ' sk-admin-secret ');
    expect(aiUsageSecrets.set).toHaveBeenCalledWith('openai', 'sk-admin-secret');
  });

  it('rejects unknown providers and does not pass the key to storage', () => {
    expect(() => handlers['aiUsageCredentials:set']({}, 'other', 'secret')).toThrow('Invalid AI usage provider');
    expect(aiUsageSecrets.set).not.toHaveBeenCalled();
  });

  it('clears an allowed provider', () => {
    handlers['aiUsageCredentials:clear']({}, 'anthropic');
    expect(aiUsageSecrets.clear).toHaveBeenCalledWith('anthropic');
  });
});
