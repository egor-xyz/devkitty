import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockClipboard, mockGetAllWindows, mockNativeImage } = vi.hoisted(() => ({
  mockClipboard: {
    availableFormats: vi.fn(),
    read: vi.fn(),
    readBuffer: vi.fn(),
    readImage: vi.fn(),
    writeImage: vi.fn()
  },
  mockGetAllWindows: vi.fn(),
  mockNativeImage: {
    createFromBuffer: vi.fn()
  }
}));

vi.mock('electron', () => ({
  BrowserWindow: { getAllWindows: mockGetAllWindows },
  clipboard: mockClipboard,
  nativeImage: mockNativeImage
}));

vi.mock('electron-log', () => ({
  default: { info: vi.fn(), warn: vi.fn() }
}));

vi.mock('../settings', () => ({
  settings: { get: vi.fn(), onDidChange: vi.fn() }
}));

import log from 'electron-log';
import { type AppSettings } from 'types/appSettings';

import { settings } from '../settings';
import {
  CLIPBOARD_MAX_EDGE,
  CLIPBOARD_POLL_MS,
  downscaleClipboard,
  forgetSeenImages,
  initClipboardDownscale,
  pngDimensions,
  pngDpi,
  stopClipboardWatcher,
  syncClipboardWatcher
} from './clipboardDownscale';

const mockSettings = vi.mocked(settings);
const mockLog = vi.mocked(log);

const chunk = (type: string, data: Buffer): Buffer => {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4);
  data.copy(out, 8);
  return out; // trailing CRC left as zeros — the parsers under test do not verify it
};

// Builds a minimal-but-valid PNG: IHDR with the pixel dimensions, then a pHYs
// chunk at the given DPI (144 = Retina screenshot; 0 = omit the chunk entirely).
const fakePng = (width: number, height: number, dpi = 144): Buffer => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);

  const parts = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr)];

  if (dpi > 0) {
    const phys = Buffer.alloc(9);
    const perMetre = Math.round(dpi / 0.0254);
    phys.writeUInt32BE(perMetre, 0); // pixels per unit, X
    phys.writeUInt32BE(perMetre, 4); // pixels per unit, Y
    phys.writeUInt8(1, 8); // unit specifier: 1 = metre
    parts.push(chunk('pHYs', phys));
  }

  return Buffer.concat(parts);
};

const emptyBuffer = Buffer.alloc(0);

describe('clipboardDownscale', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stopClipboardWatcher();
    forgetSeenImages();
    mockClipboard.read.mockReturnValue(''); // no file-url on the pasteboard by default
    vi.useRealTimers();
  });

  describe('pngDimensions', () => {
    it('parses width and height from a valid PNG header', () => {
      expect(pngDimensions(fakePng(4000, 2400))).toEqual({ height: 2400, width: 4000 });
    });

    it('returns null for a buffer shorter than 24 bytes', () => {
      expect(pngDimensions(Buffer.alloc(10))).toBeNull();
    });

    it('returns null when the signature does not match', () => {
      const buf = fakePng(100, 100);
      buf[0] = 0x00;
      expect(pngDimensions(buf)).toBeNull();
    });
  });

  describe('pngDpi', () => {
    it('reads 144 DPI from a Retina-screenshot pHYs chunk', () => {
      expect(Math.round(pngDpi(fakePng(100, 100, 144)) ?? 0)).toBe(144);
    });

    it('returns null when the PNG has no pHYs chunk', () => {
      expect(pngDpi(fakePng(100, 100, 0))).toBeNull();
    });

    it('returns null for a non-PNG buffer', () => {
      expect(pngDpi(Buffer.alloc(2000))).toBeNull();
    });
  });

  describe('screenshot gate', () => {
    const bigOut = () => {
      const resized = { toPNG: vi.fn(() => Buffer.alloc(100)) };
      return { image: { resize: vi.fn(() => resized) }, resized };
    };

    it('skips a non-screenshot image (72 DPI, no screenshot file-url)', () => {
      mockClipboard.availableFormats.mockReturnValue(['image/png']);
      mockClipboard.readBuffer.mockReturnValue(fakePng(4000, 2400, 72));
      mockNativeImage.createFromBuffer.mockReturnValue(bigOut().image);

      expect(downscaleClipboard()).toBeNull();
      expect(mockClipboard.writeImage).not.toHaveBeenCalled();
    });

    it('skips a browser Copy Image even at Retina DPI (text/html on the clipboard)', () => {
      mockClipboard.availableFormats.mockReturnValue(['image/png', 'text/html']);
      mockClipboard.readBuffer.mockReturnValue(fakePng(4000, 2400, 144));
      mockNativeImage.createFromBuffer.mockReturnValue(bigOut().image);

      expect(downscaleClipboard()).toBeNull();
      expect(mockClipboard.writeImage).not.toHaveBeenCalled();
    });

    it('downscales a CleanShot file copy that has no DPI, via the screenshot file-url', () => {
      const { image } = bigOut();
      mockClipboard.availableFormats.mockReturnValue(['text/uri-list']);
      mockClipboard.readBuffer.mockReturnValue(fakePng(4000, 2400, 0));
      mockClipboard.read.mockReturnValue('file:///Users/x/Desktop/CleanShot%202026.png');
      mockNativeImage.createFromBuffer.mockReturnValue(image);

      expect(downscaleClipboard()).not.toBeNull();
      expect(mockClipboard.writeImage).toHaveBeenCalledTimes(1);
    });
  });

  describe('downscaleClipboard', () => {
    it('returns null and skips readImage when no image/* format is present', () => {
      mockClipboard.availableFormats.mockReturnValue(['text/plain']);
      mockClipboard.readBuffer.mockReturnValue(emptyBuffer);

      expect(downscaleClipboard()).toBeNull();
      expect(mockClipboard.readImage).not.toHaveBeenCalled();
    });

    it('returns null for a Finder file copy (text/uri-list present, no PNG buffer)', () => {
      mockClipboard.availableFormats.mockReturnValue(['text/uri-list']);
      mockClipboard.readBuffer.mockReturnValue(emptyBuffer);

      expect(downscaleClipboard()).toBeNull();
      expect(mockClipboard.readImage).not.toHaveBeenCalled();
    });

    it('skips an image it has already shrunk once (re-copied original stays full size)', () => {
      const png = fakePng(4000, 2400);
      const resized = { toPNG: vi.fn(() => Buffer.alloc(10)) };
      const image = { resize: vi.fn(() => resized) };
      mockClipboard.availableFormats.mockReturnValue(['image/png']);
      mockClipboard.readBuffer.mockReturnValue(png);
      mockNativeImage.createFromBuffer.mockReturnValue(image);

      expect(downscaleClipboard()).not.toBeNull();
      expect(downscaleClipboard()).toBeNull();
      expect(mockClipboard.writeImage).toHaveBeenCalledTimes(1);

      // A different original is still processed.
      mockClipboard.readBuffer.mockReturnValue(fakePng(4000, 2401));
      expect(downscaleClipboard()).not.toBeNull();
      expect(mockClipboard.writeImage).toHaveBeenCalledTimes(2);
    });

    it('downscales a CleanShot screenshot (text/uri-list present, but a valid PNG buffer)', () => {
      const png = fakePng(4000, 2400);
      const out = Buffer.alloc(1000);
      const resized = { toPNG: vi.fn(() => out) };
      const image = { resize: vi.fn(() => resized) };
      mockClipboard.availableFormats.mockReturnValue(['text/uri-list']);
      mockClipboard.readBuffer.mockReturnValue(png);
      mockNativeImage.createFromBuffer.mockReturnValue(image);

      const result = downscaleClipboard();

      expect(image.resize).toHaveBeenCalledWith({ height: 720, quality: 'best', width: 1200 });
      expect(mockClipboard.writeImage).toHaveBeenCalledWith(resized);
      expect(result).toEqual({
        bytes: { from: png.length, to: out.length },
        from: { height: 2400, width: 4000 },
        to: { height: 720, width: 1200 }
      });
    });

    it('downscales a landscape PNG proportionally and writes it back', () => {
      const png = fakePng(4000, 2400);
      const out = Buffer.alloc(1000);
      const resized = { toPNG: vi.fn(() => out) };
      const image = { resize: vi.fn(() => resized) };
      mockClipboard.availableFormats.mockReturnValue(['image/png']);
      mockClipboard.readBuffer.mockReturnValue(png);
      mockNativeImage.createFromBuffer.mockReturnValue(image);

      const result = downscaleClipboard();

      expect(image.resize).toHaveBeenCalledWith({ height: 720, quality: 'best', width: 1200 });
      expect(mockClipboard.writeImage).toHaveBeenCalledWith(resized);
      expect(result).toEqual({
        bytes: { from: png.length, to: out.length },
        from: { height: 2400, width: 4000 },
        to: { height: 720, width: 1200 }
      });
    });

    it('downscales a portrait PNG proportionally', () => {
      const png = fakePng(1000, 3000);
      const out = Buffer.alloc(500);
      const image = { resize: vi.fn(() => ({ toPNG: vi.fn(() => out) })) };
      mockClipboard.availableFormats.mockReturnValue(['image/png']);
      mockClipboard.readBuffer.mockReturnValue(png);
      mockNativeImage.createFromBuffer.mockReturnValue(image);

      const result = downscaleClipboard();

      expect(image.resize).toHaveBeenCalledWith({ height: 1200, quality: 'best', width: 400 });
      expect(result).toEqual({
        bytes: { from: png.length, to: out.length },
        from: { height: 3000, width: 1000 },
        to: { height: 1200, width: 400 }
      });
    });

    it('returns null and does not write when the image is already within the max edge', () => {
      const png = fakePng(1200, 800);
      mockClipboard.availableFormats.mockReturnValue(['image/png']);
      mockClipboard.readBuffer.mockReturnValue(png);

      expect(downscaleClipboard()).toBeNull();
      expect(mockClipboard.writeImage).not.toHaveBeenCalled();
    });

    it('falls back to clipboard.readImage() when no public.png buffer is available', () => {
      const out = Buffer.alloc(300);
      const image = {
        getSize: vi.fn(() => ({ height: 1000, width: 2500 })),
        isEmpty: vi.fn(() => false),
        resize: vi.fn(() => ({ toPNG: vi.fn(() => out) })),
        toPNG: vi.fn(() => Buffer.alloc(2000))
      };
      mockClipboard.availableFormats.mockReturnValue(['image/png']);
      mockClipboard.readBuffer.mockReturnValue(emptyBuffer);
      mockClipboard.readImage.mockReturnValue(image);
      mockClipboard.read.mockReturnValue('file:///Users/x/Desktop/CleanShot%202026.png');

      const result = downscaleClipboard();

      expect(image.resize).toHaveBeenCalledWith({ height: 480, quality: 'best', width: 1200 });
      expect(result).toEqual({
        bytes: { from: 2000, to: out.length },
        from: { height: 1000, width: 2500 },
        to: { height: 480, width: 1200 }
      });
    });

    it('returns null when both the PNG buffer and the fallback image are empty', () => {
      const image = { getSize: vi.fn(), isEmpty: vi.fn(() => true) };
      mockClipboard.availableFormats.mockReturnValue(['image/png']);
      mockClipboard.readBuffer.mockReturnValue(emptyBuffer);
      mockClipboard.readImage.mockReturnValue(image);

      expect(downscaleClipboard()).toBeNull();
    });
  });

  describe('syncClipboardWatcher', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      mockClipboard.availableFormats.mockReturnValue(['text/plain']);
      mockClipboard.readBuffer.mockReturnValue(emptyBuffer);
    });

    it('runs one tick immediately and then on each interval', () => {
      syncClipboardWatcher(true);
      expect(mockClipboard.availableFormats).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(CLIPBOARD_POLL_MS);
      expect(mockClipboard.availableFormats).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(CLIPBOARD_POLL_MS);
      expect(mockClipboard.availableFormats).toHaveBeenCalledTimes(3);
    });

    it('is idempotent — calling with true again does not create a second interval', () => {
      syncClipboardWatcher(true);
      syncClipboardWatcher(true);
      mockClipboard.availableFormats.mockClear();

      vi.advanceTimersByTime(CLIPBOARD_POLL_MS);
      expect(mockClipboard.availableFormats).toHaveBeenCalledTimes(1);
    });

    it('stops polling when called with false', () => {
      syncClipboardWatcher(true);
      mockClipboard.availableFormats.mockClear();

      syncClipboardWatcher(false);
      vi.advanceTimersByTime(CLIPBOARD_POLL_MS * 3);

      expect(mockClipboard.availableFormats).not.toHaveBeenCalled();
    });

    it('sends clipboard:downscaled to every window on a successful downscale', () => {
      const png = fakePng(4000, 2400);
      const out = Buffer.alloc(100);
      const image = { resize: vi.fn(() => ({ toPNG: vi.fn(() => out) })) };
      mockClipboard.availableFormats.mockReturnValue(['image/png']);
      mockClipboard.readBuffer.mockReturnValue(png);
      mockNativeImage.createFromBuffer.mockReturnValue(image);
      const send = vi.fn();
      mockGetAllWindows.mockReturnValue([{ webContents: { send } }]);

      syncClipboardWatcher(true);

      expect(send).toHaveBeenCalledWith('clipboard:downscaled', {
        bytes: { from: png.length, to: out.length },
        from: { height: 2400, width: 4000 },
        to: { height: 720, width: 1200 }
      });
    });

    it('catches an error thrown mid-tick, logs it, and keeps the interval running', () => {
      mockClipboard.availableFormats.mockImplementation(() => {
        throw new Error('boom');
      });

      syncClipboardWatcher(true);

      expect(mockLog.warn).toHaveBeenCalled();

      mockClipboard.availableFormats.mockClear();
      mockClipboard.availableFormats.mockReturnValue(['text/plain']);
      vi.advanceTimersByTime(CLIPBOARD_POLL_MS);
      expect(mockClipboard.availableFormats).toHaveBeenCalledTimes(1);
    });
  });

  describe('initClipboardDownscale', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      mockClipboard.availableFormats.mockReturnValue(['text/plain']);
      mockClipboard.readBuffer.mockReturnValue(emptyBuffer);
    });

    it('starts the watcher immediately when the stored setting is on', () => {
      mockSettings.get.mockReturnValue({ clipboardDownscale: true } as unknown as AppSettings);

      initClipboardDownscale();

      expect(mockClipboard.availableFormats).toHaveBeenCalledTimes(1);
    });

    it('does not start the watcher when the stored setting is off or missing', () => {
      mockSettings.get.mockReturnValue({} as unknown as AppSettings);

      initClipboardDownscale();

      expect(mockClipboard.availableFormats).not.toHaveBeenCalled();
    });

    it('stops the watcher when settings change to disabled', () => {
      mockSettings.get.mockReturnValue({ clipboardDownscale: true } as unknown as AppSettings);
      initClipboardDownscale();
      mockClipboard.availableFormats.mockClear();

      const onDidChangeCallback = mockSettings.onDidChange.mock.calls[0][1] as (next: Partial<AppSettings>) => void;
      onDidChangeCallback({ clipboardDownscale: false });

      vi.advanceTimersByTime(CLIPBOARD_POLL_MS * 2);
      expect(mockClipboard.availableFormats).not.toHaveBeenCalled();
    });
  });

  it('exports the expected constants', () => {
    expect(CLIPBOARD_MAX_EDGE).toBe(1200);
    expect(CLIPBOARD_POLL_MS).toBe(1000);
  });
});
