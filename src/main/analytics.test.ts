import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: { getVersion: vi.fn(() => '4.3.2') }
}));

vi.mock('electron-log', () => ({
  default: { error: vi.fn(), info: vi.fn() }
}));

vi.mock('./settings', () => ({
  settings: { get: vi.fn(), set: vi.fn() }
}));

import log from 'electron-log';

import { track } from './analytics';
import { settings } from './settings';

const mockFetch = vi.fn<typeof fetch>();
const mockLog = vi.mocked(log);
const mockSettings = vi.mocked(settings);

const response = (ok: boolean, status: number, body: string): Response =>
  ({ ok, status, text: vi.fn().mockResolvedValue(body) }) as unknown as Response;

describe('analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    vi.stubEnv('MAIN_VITE_GA_API_SECRET', 'test-secret');
    vi.stubEnv('MAIN_VITE_GA_DEBUG', 'false');
    mockSettings.get.mockImplementation((key) => {
      if (key === 'clientId') return 'test-client';
      if (key === 'appSettings') return { telemetry: true } as never;
      return undefined;
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends an event without an error for a good response', async () => {
    const gaResponse = response(true, 204, '');
    mockFetch.mockResolvedValue(gaResponse);

    await track('app_launch');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(gaResponse.text).toHaveBeenCalledTimes(1);
    expect(mockLog.error).not.toHaveBeenCalled();
  });

  it('logs a bad response and still resolves', async () => {
    const gaResponse = response(false, 403, 'request rejected');
    mockFetch.mockResolvedValue(gaResponse);

    await expect(track('app_launch')).resolves.toBeUndefined();

    expect(gaResponse.text).toHaveBeenCalledTimes(1);
    expect(mockLog.error).toHaveBeenCalledWith('[analytics] GA4 send failed:', 403, 'request rejected');
  });

  it('keeps debug response logging', async () => {
    const gaResponse = response(true, 200, '{"validationMessages":[]}');
    mockFetch.mockResolvedValue(gaResponse);
    vi.stubEnv('MAIN_VITE_GA_DEBUG', 'true');

    await track('app_launch');

    expect(gaResponse.text).toHaveBeenCalledTimes(1);
    expect(mockLog.info).toHaveBeenCalledWith(
      '[analytics] GA4 debug response:',
      '{"validationMessages":[]}'
    );
  });

  it('does not send without an API secret', async () => {
    vi.stubEnv('MAIN_VITE_GA_API_SECRET', '');

    await track('app_launch');

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
