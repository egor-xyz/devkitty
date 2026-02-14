import { describe, it, expect, vi, beforeEach } from 'vitest';

const handlers: Record<string, (...args: any[]) => any> = {};

const mockTray = {
  destroy: vi.fn(),
  on: vi.fn(),
  setTitle: vi.fn(),
  setToolTip: vi.fn()
};

vi.mock('electron', () => {
  const TrayConstructor = function () {
    return mockTray;
  };

  return {
    ipcMain: {
      handle: vi.fn((channel: string, handler: any) => {
        handlers[channel] = handler;
      })
    },
    nativeImage: {
      createEmpty: vi.fn(() => 'empty-image')
    },
    Tray: TrayConstructor
  };
});

await import('./ipcSticker');

describe('ipcSticker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sticker:add', () => {
    it('should create a new tray with the given text', async () => {
      await handlers['sticker:add']({}, 'Hello World');

      expect(mockTray.setTitle).toHaveBeenCalledWith('Hello World', { fontType: 'monospaced' });
    });

    it('should set tooltip on the tray', async () => {
      await handlers['sticker:add']({}, 'Test');

      expect(mockTray.setToolTip).toHaveBeenCalledWith('Devkitty. Click to remove sticker.');
    });

    it('should register click handler on tray', async () => {
      await handlers['sticker:add']({}, 'Test');

      expect(mockTray.on).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should destroy existing tray before creating new one', async () => {
      // First call creates a tray
      await handlers['sticker:add']({}, 'First');

      // Second call should destroy the first tray
      await handlers['sticker:add']({}, 'Second');

      expect(mockTray.destroy).toHaveBeenCalled();
    });
  });
});
