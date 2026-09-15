import { beforeEach, describe, expect, it, vi } from 'vitest';

type IpcHandler = (...args: unknown[]) => unknown;

const handlers: Record<string, IpcHandler> = {};
const mocks = vi.hoisted(() => ({ track: vi.fn() }));

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: IpcHandler) => {
      handlers[channel] = handler;
    })
  }
}));
vi.mock('../analytics', () => ({ track: mocks.track }));

await import('./ipcAnalytics');

describe('ipcAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['Projects', 'https://devkitty.app/app'],
    ['Settings', 'https://devkitty.app/app/settings']
  ])('allows the safe %s page view', (page_title, page_location) => {
    const params = { page_location, page_title };

    handlers['analytics:trackEvent']({}, 'page_view', params);

    expect(mocks.track).toHaveBeenCalledWith('page_view', params);
  });

  it.each([
    ['app_launch', { page_location: 'https://devkitty.app/app', page_title: 'Projects' }],
    ['page_view', { page_location: 'https://example.com', page_title: 'Projects' }],
    ['page_view', { page_location: 'https://devkitty.app/app', page_title: 'Settings' }],
    ['page_view', { extra: true, page_location: 'https://devkitty.app/app', page_title: 'Projects' }],
    ['page_view', undefined]
  ])('rejects unsafe event data: %s', (name, params) => {
    expect(() => handlers['analytics:trackEvent']({}, name, params)).toThrow('Invalid Analytics event');
    expect(mocks.track).not.toHaveBeenCalled();
  });
});
