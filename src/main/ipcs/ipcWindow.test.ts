import { beforeEach, describe, expect, it, vi } from 'vitest';

type IpcHandler = (...args: unknown[]) => unknown;

const handlers: Record<string, IpcHandler> = {};

const makeWindow = () => ({
  isAlwaysOnTop: vi.fn(() => false),
  setAlwaysOnTop: vi.fn(),
  setOpacity: vi.fn(),
  setVisibleOnAllWorkspaces: vi.fn()
});

let win = makeWindow();
let fromWebContentsResult: null | typeof win = win;

vi.mock('electron', () => ({
  BrowserWindow: {
    fromWebContents: vi.fn(() => fromWebContentsResult)
  },
  ipcMain: {
    handle: vi.fn((channel: string, handler: IpcHandler) => {
      handlers[channel] = handler;
    })
  }
}));

await import('./ipcWindow');

const event = { sender: {} };

describe('ipcWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    win = makeWindow();
    fromWebContentsResult = win;
  });

  describe('window:getPinnedAppearance', () => {
    it.each([true, false])('uses the native pin state %s and full opacity for a new window', (alwaysOnTop) => {
      win.isAlwaysOnTop.mockReturnValue(alwaysOnTop);

      expect(handlers['window:getPinnedAppearance'](event)).toEqual({ alwaysOnTop, opacity: 1 });
    });

    it('returns the stored logical opacity after the window is unpinned', () => {
      handlers['window:setPinnedAppearance'](event, true, 0.62);
      handlers['window:setPinnedAppearance'](event, false, 0.62);

      expect(handlers['window:getPinnedAppearance'](event)).toEqual({ alwaysOnTop: false, opacity: 0.62 });
    });

    it('returns the safe state when there is no window', () => {
      fromWebContentsResult = null;

      expect(handlers['window:getPinnedAppearance'](event)).toEqual({ alwaysOnTop: false, opacity: 1 });
    });
  });

  describe('window:setPinnedAppearance', () => {
    it.each([0.4, 0.73, 1])('pins with allowed opacity %s', (opacity) => {
      expect(handlers['window:setPinnedAppearance'](event, true, opacity)).toEqual({
        alwaysOnTop: true,
        opacity
      });
      expect(win.setAlwaysOnTop).toHaveBeenCalledWith(true, 'screen-saver');
      expect(win.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(true, {
        skipTransformProcessType: true,
        visibleOnFullScreen: true
      });
      expect(win.setOpacity).toHaveBeenCalledWith(opacity);
    });

    it('keeps the saved opacity but disables glass when it unpins', () => {
      expect(handlers['window:setPinnedAppearance'](event, false, 0.47)).toEqual({
        alwaysOnTop: false,
        opacity: 0.47
      });
      expect(win.setAlwaysOnTop).toHaveBeenCalledWith(false, 'screen-saver');
      expect(win.setOpacity).toHaveBeenCalledWith(1);
    });

    it.each(['true', 0, 1, null, undefined])('rejects invalid pin flag %s', (flag) => {
      expect(() => handlers['window:setPinnedAppearance'](event, flag, 0.5)).toThrow('Invalid always-on-top flag');
      expect(win.setAlwaysOnTop).not.toHaveBeenCalled();
    });

    it.each([0, 0.39, 1.01, 2, NaN, Infinity, -Infinity, '0.5', null, undefined])(
      'rejects invalid opacity %s',
      (opacity) => {
        expect(() => handlers['window:setPinnedAppearance'](event, true, opacity)).toThrow('Invalid window opacity');
        expect(win.setAlwaysOnTop).not.toHaveBeenCalled();
      }
    );

    it('returns the safe state and touches nothing when there is no window', () => {
      fromWebContentsResult = null;

      expect(handlers['window:setPinnedAppearance'](event, true, 0.5)).toEqual({ alwaysOnTop: false, opacity: 1 });
      expect(win.setAlwaysOnTop).not.toHaveBeenCalled();
      expect(win.setOpacity).not.toHaveBeenCalled();
    });
  });
});
