import { beforeEach, describe, expect, it, vi } from 'vitest';

const handlers: Record<string, (...args: any[]) => any> = {};

const win = {
  isAlwaysOnTop: vi.fn(() => false),
  setAlwaysOnTop: vi.fn(),
  setVisibleOnAllWorkspaces: vi.fn()
};

let fromWebContentsResult: null | typeof win = win;

vi.mock('electron', () => ({
  BrowserWindow: {
    fromWebContents: vi.fn(() => fromWebContentsResult)
  },
  ipcMain: {
    handle: vi.fn((channel: string, handler: any) => {
      handlers[channel] = handler;
    })
  }
}));

// Import after mocks so the module registers its handlers against them.
await import('./ipcWindow');

const event = { sender: {} };

describe('ipcWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromWebContentsResult = win;
    win.isAlwaysOnTop.mockReturnValue(false);
  });

  describe('window:setAlwaysOnTop', () => {
    it('pins the window at the screen-saver level so it floats over full-screen apps', () => {
      handlers['window:setAlwaysOnTop'](event, true);

      expect(win.setAlwaysOnTop).toHaveBeenCalledWith(true, 'screen-saver');
    });

    it('skips the process-type transform so macOS keeps the Dock icon', () => {
      handlers['window:setAlwaysOnTop'](event, true);

      expect(win.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(true, {
        skipTransformProcessType: true,
        visibleOnFullScreen: true
      });
    });

    it('reports back the flag it applied, not isAlwaysOnTop() which can read stale', () => {
      // The window lies and says it is not on top right after the call; the
      // handler must still report the flag it was asked to apply.
      win.isAlwaysOnTop.mockReturnValue(false);

      expect(handlers['window:setAlwaysOnTop'](event, true)).toBe(true);
      expect(handlers['window:setAlwaysOnTop'](event, false)).toBe(false);
    });

    it('returns false and touches nothing when there is no window', () => {
      fromWebContentsResult = null;

      expect(handlers['window:setAlwaysOnTop'](event, true)).toBe(false);
      expect(win.setAlwaysOnTop).not.toHaveBeenCalled();
    });
  });

  describe('window:getAlwaysOnTop', () => {
    it('reflects the real pinned state of the window', () => {
      win.isAlwaysOnTop.mockReturnValue(true);

      expect(handlers['window:getAlwaysOnTop'](event)).toBe(true);
    });

    it('returns false when there is no window', () => {
      fromWebContentsResult = null;

      expect(handlers['window:getAlwaysOnTop'](event)).toBe(false);
    });
  });
});
