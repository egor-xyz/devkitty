import { describe, expect, it, vi } from 'vitest';

import { fetchJson } from './fetchJson';

describe('fetchJson', () => {
  it('returns parsed JSON', async () => {
    await expect(fetchJson('https://test', { fetcher: vi.fn(async () => new Response('{"ok":true}')) })).resolves.toEqual({ ok: true });
  });

  it('caps response bytes', async () => {
    const fetcher = vi.fn(async () => new Response('x'.repeat(20)));
    await expect(fetchJson('https://test', { fetcher, maxBytes: 10 })).rejects.toThrow('too large');
  });

  it('times out and does not expose a request error', async () => {
    const secret = 'sk-admin-secret';
    const fetcher = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error(secret)));
    }));
    const error = await fetchJson('https://test', { fetcher, timeoutMs: 1 }).catch((value: unknown) => value);
    expect(String(error)).toContain('timed out');
    expect(String(error)).not.toContain(secret);
  });

  it('does not expose an HTTP response body', async () => {
    const secret = 'private response';
    const error = await fetchJson('https://test', { fetcher: vi.fn(async () => new Response(secret, { status: 400 })) }).catch((value: unknown) => value);
    expect(String(error)).toBe('Error: Request failed (400)');
    expect(String(error)).not.toContain(secret);
  });
});
