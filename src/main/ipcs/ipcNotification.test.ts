import { beforeEach, describe, expect, it, vi } from 'vitest';

const handlers: Record<string, (...args: any[]) => any> = {};

const { mockNotificationShow, NotificationMock } = vi.hoisted(() => {
  const mockNotificationShow = vi.fn();
  // Must be a constructable function (used with `new`); do not let --fix turn it into an arrow.
  // eslint-disable-next-line prefer-arrow-callback
  const NotificationMock: any = vi.fn(function () {
    return { show: mockNotificationShow };
  });
  NotificationMock.isSupported = vi.fn();
  return { mockNotificationShow, NotificationMock };
});

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: any) => {
      handlers[channel] = handler;
    })
  },
  Notification: NotificationMock
}));

import { Notification } from 'electron';

// Trigger the side effects that register IPC handlers
await import('./ipcNotification');

const mockNotification = vi.mocked(Notification);

describe('ipcNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('notification:show', () => {
    it('should construct and show a Notification when notifications are supported', async () => {
      (mockNotification.isSupported as any).mockReturnValue(true);

      await handlers['notification:show']({}, 'Hello', 'World');

      expect(mockNotification).toHaveBeenCalledWith({
        body: 'World',
        timeoutType: 'never',
        title: 'Hello'
      });
      expect(mockNotificationShow).toHaveBeenCalled();
    });

    it('should not construct a Notification when notifications are not supported', async () => {
      (mockNotification.isSupported as any).mockReturnValue(false);

      await handlers['notification:show']({}, 'Hello', 'World');

      expect(mockNotification).not.toHaveBeenCalled();
      expect(mockNotificationShow).not.toHaveBeenCalled();
    });
  });
});
