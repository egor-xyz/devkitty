import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({ safeStorage: {} }));
vi.mock('electron-store', () => ({ default: class { delete = vi.fn(); get = vi.fn(); set = vi.fn(); } }));

import { createAIUsageSecrets } from './secrets';

describe('AI usage secrets', () => {
  const values = new Map<string, string>();
  const store = {
    delete: vi.fn((key: string) => values.delete(key)),
    get: vi.fn((key: string) => values.get(key)),
    set: vi.fn((key: string, value: string) => values.set(key, value))
  };
  const crypto = {
    decryptString: vi.fn((value: Buffer) => value.toString().replace('locked:', '')),
    encryptString: vi.fn((value: string) => Buffer.from(`locked:${value}`)),
    isEncryptionAvailable: vi.fn(() => true)
  };
  const secrets = createAIUsageSecrets(store, crypto);

  beforeEach(() => {
    values.clear();
    vi.clearAllMocks();
  });

  it('stores only encrypted text and returns only boolean status', () => {
    secrets.set('anthropic', 'sk-ant-admin-secret');
    expect([...values.values()][0]).not.toContain('sk-ant-admin-secret');
    expect(secrets.status()).toEqual({ anthropic: true, openai: false });
  });

  it.each([
    ['anthropic', 'sk-ant-api03-normal'],
    ['openai', 'sk-proj-normal']
  ] as const)('rejects a normal %s API key', (provider, key) => {
    expect(() => secrets.set(provider, key)).toThrow('admin key');
    expect(store.set).not.toHaveBeenCalled();
  });

  it('does not write when secure storage is unavailable', () => {
    crypto.isEncryptionAvailable.mockReturnValueOnce(false);
    expect(() => secrets.set('openai', 'sk-admin-secret')).toThrow('Secure storage');
    expect(store.set).not.toHaveBeenCalled();
  });

  it('clears a key and hides damaged encrypted data', () => {
    values.set('openai', 'bad');
    crypto.decryptString.mockImplementationOnce(() => { throw new Error('bad'); });
    expect(secrets.status().openai).toBe(false);
    secrets.clear('openai');
    expect(values.has('openai')).toBe(false);
  });
});
