import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: { getVersion: vi.fn(() => '4.3.2'), isPackaged: true }
}));

vi.mock('electron-log', () => ({
  default: { error: vi.fn(), info: vi.fn() }
}));

vi.mock('./settings', () => ({
  settings: { get: vi.fn(), set: vi.fn() }
}));

import { app } from 'electron';
import log from 'electron-log';

import { track } from './analytics';
import { settings } from './settings';

const mockFetch = vi.fn<typeof fetch>();
const mockLog = vi.mocked(log);
const mockSettings = vi.mocked(settings);
const setIsPackaged = (value: boolean): void => {
  Object.defineProperty(app, 'isPackaged', { configurable: true, value });
};

const response = (ok: boolean, status: number, body: string): Response => ({
  json: vi.fn(async () => JSON.parse(body || '{}')),
  ok,
  status,
  text: vi.fn().mockResolvedValue(body)
}) as unknown as Response;

const sentPayload = (): {
  client_id: string;
  events: { name: string; params: Record<string, unknown> }[];
} => {
  const request = mockFetch.mock.calls[0]?.[1];
  return JSON.parse(String(request?.body));
};

describe('analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    setIsPackaged(true);
    vi.stubGlobal('fetch', mockFetch);
    vi.stubEnv('MAIN_VITE_GA_API_SECRET', 'test-secret');
    vi.stubEnv('MAIN_VITE_GA_DEBUG', 'false');
    mockSettings.get.mockImplementation((key) => {
      if (key === 'clientId') return '123456789.987654321';
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
    expect(mockLog.error).not.toHaveBeenCalled();
    expect(mockLog.info).toHaveBeenCalledWith(
      '[analytics] GA4 event sent:',
      'app_launch',
      204,
      '4.3.2'
    );
    expect(JSON.stringify(mockLog.info.mock.calls)).not.toContain('test-secret');
    expect(JSON.stringify(mockLog.info.mock.calls)).not.toContain('123456789.987654321');
  });

  it('reuses a valid stored client ID', async () => {
    mockFetch.mockResolvedValue(response(true, 204, ''));

    await track('app_launch');

    expect(sentPayload().client_id).toBe('123456789.987654321');
    expect(mockSettings.set).not.toHaveBeenCalled();
  });

  it.each(['550e8400-e29b-41d4-a716-446655440000', '', '0.1', '1.0', '12.-3', '12.34.56'])(
    'replaces an invalid stored client ID: %s',
    async (storedClientId) => {
      mockSettings.get.mockImplementation((key) => {
        if (key === 'clientId') return storedClientId || undefined;
        if (key === 'appSettings') return { telemetry: true } as never;
        return undefined;
      });
      mockFetch.mockResolvedValue(response(true, 204, ''));

      await track('app_launch');

      const clientId = sentPayload().client_id;
      expect(clientId).toMatch(/^[1-9]\d*\.[1-9]\d*$/);
      expect(mockSettings.set).toHaveBeenCalledWith('clientId', clientId);
    }
  );

  it('keeps canonical event values when caller params try to replace them', async () => {
    mockFetch.mockResolvedValue(response(true, 204, ''));

    await track('app_launch', {
      app_version: 'caller-version',
      engagement_time_msec: 'caller-engagement',
      session_id: 'caller-session'
    });

    const [{ params }] = sentPayload().events;
    expect(params.engagement_time_msec).toBe(100);
    expect(typeof params.engagement_time_msec).toBe('number');
    expect(Number.isInteger(params.session_id)).toBe(true);
    expect(params.session_id).toBeGreaterThan(0);
    expect(params.app_version).toBe('4.3.2');
  });

  it('does not send from a development build', async () => {
    setIsPackaged(false);

    await track('app_launch');

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockSettings.get).not.toHaveBeenCalled();
  });

  it('does not send when telemetry is off', async () => {
    mockSettings.get.mockImplementation((key) => {
      if (key === 'appSettings') return { telemetry: false } as never;
      if (key === 'clientId') return '123456789.987654321';
      return undefined;
    });
    vi.stubEnv('MAIN_VITE_GA_DEBUG', 'true');

    await track('app_launch');

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockSettings.get).not.toHaveBeenCalledWith('clientId');
  });

  it('logs a bad response and still resolves', async () => {
    const gaResponse = response(false, 403, 'request rejected');
    mockFetch.mockResolvedValue(gaResponse);

    await expect(track('app_launch')).resolves.toBeUndefined();

    expect(mockLog.error).toHaveBeenCalledWith(
      '[analytics] GA4 send failed:',
      'app_launch',
      403,
      '4.3.2'
    );
    expect(JSON.stringify(mockLog.error.mock.calls)).not.toContain('request rejected');
    expect(JSON.stringify(mockLog.error.mock.calls)).not.toContain('test-secret');
    expect(JSON.stringify(mockLog.error.mock.calls)).not.toContain('123456789.987654321');
  });

  it('keeps debug response logging', async () => {
    const gaResponse = response(true, 200, '{"validationMessages":[]}');
    mockFetch.mockResolvedValue(gaResponse);
    vi.stubEnv('MAIN_VITE_GA_DEBUG', 'true');

    await track('app_launch');

    expect(sentPayload()).toMatchObject({ validation_behavior: 'ENFORCE_RECOMMENDATIONS' });
    expect(mockLog.info).toHaveBeenCalledWith('[analytics] GA4 debug reply:', 200);
  });

  it('logs only safe fields when debug validation fails', async () => {
    const gaResponse = response(true, 200, JSON.stringify({
      validationMessages: [{
        description: 'secret value test-secret is bad',
        fieldPath: 'events[0].params.session_id',
        validationCode: 'VALUE_INVALID'
      }]
    }));
    mockFetch.mockResolvedValue(gaResponse);
    vi.stubEnv('MAIN_VITE_GA_DEBUG', 'true');

    await track('app_launch');

    expect(mockLog.info).not.toHaveBeenCalledWith(
      '[analytics] GA4 event sent:',
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
    expect(mockLog.error).toHaveBeenCalledWith(
      '[analytics] GA4 validation failed:',
      'app_launch',
      [{
        fieldPath: 'events[0].params.session_id',
        validationCode: 'VALUE_INVALID'
      }],
      '4.3.2'
    );
    expect(JSON.stringify(mockLog.error.mock.calls)).not.toContain('secret value');
    expect(JSON.stringify(mockLog.error.mock.calls)).not.toContain('test-secret');
  });

  it('does not send without an API secret', async () => {
    vi.stubEnv('MAIN_VITE_GA_API_SECRET', '');

    await track('app_launch');

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockSettings.get).not.toHaveBeenCalled();
  });

  it('logs a safe error when fetch throws', async () => {
    mockFetch.mockRejectedValue(
      new Error('failed URL test-secret client 123456789.987654321')
    );

    await expect(track('app_launch')).resolves.toBeUndefined();

    expect(mockLog.error).toHaveBeenCalledWith(
      '[analytics] failed to send event:',
      'app_launch',
      '4.3.2'
    );
    expect(JSON.stringify(mockLog.error.mock.calls)).not.toContain('test-secret');
    expect(JSON.stringify(mockLog.error.mock.calls)).not.toContain('123456789.987654321');
  });
});
