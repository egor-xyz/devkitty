import { createHash } from 'crypto';
import { BrowserWindow, clipboard, nativeImage, type NativeImage } from 'electron';
import log from 'electron-log';
import { type DownscaleResult, type ImageSize } from 'types/clipboard';

import { settings } from '../settings';

export const CLIPBOARD_MAX_EDGE = 1200;
export const CLIPBOARD_POLL_MS = 1000;
// Fingerprints of source images already shrunk once. Re-copying the same
// original (e.g. from a clipboard manager) is a deliberate choice to use it at
// full size, so it is left alone.
const SEEN_LIMIT = 100;
const seen = new Set<string>();

const fingerprint = (bytes: Buffer): string => createHash('sha1').update(bytes).digest('hex');

const remember = (hash: string): void => {
  seen.add(hash);
  if (seen.size > SEEN_LIMIT) seen.delete(seen.values().next().value as string);
};

export const forgetSeenImages = (): void => seen.clear();

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PHYS_CHUNK = Buffer.from('pHYs');
const METRES_PER_INCH = 0.0254;
// macOS tags Retina screenshots at 144 DPI; photos and web images sit at 72 or
// carry no DPI at all. 120 cleanly separates the two.
const RETINA_SCREENSHOT_DPI = 120;
const SCREENSHOT_FILE = /screenshot|cleanshot/i;

export const pngDimensions = (png: Buffer): ImageSize | null => {
  if (png.length < 24 || !png.subarray(0, 8).equals(PNG_SIGNATURE)) return null;

  return { height: png.readUInt32BE(20), width: png.readUInt32BE(16) };
};

// Horizontal DPI from the PNG pHYs chunk, or null when it is absent or not in metres.
export const pngDpi = (png: Buffer): number | null => {
  if (png.length < 8 || !png.subarray(0, 8).equals(PNG_SIGNATURE)) return null;

  let offset = 8;
  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset);
    if (png.subarray(offset + 4, offset + 8).equals(PHYS_CHUNK)) {
      const data = offset + 8;
      if (data + 9 > png.length || png.readUInt8(data + 8) !== 1) return null;
      return png.readUInt32BE(data) * METRES_PER_INCH;
    }
    offset += 12 + length;
  }

  return null;
};

// Best effort: a macOS screenshot is a Retina-DPI PNG or a file dropped from a
// screenshot tool. A browser "Copy Image" always brings HTML along — never a screenshot.
const isScreenshot = (png: Buffer, formats: string[]): boolean => {
  if (formats.includes('text/html')) return false;

  const dpi = pngDpi(png);
  if (dpi !== null && dpi >= RETINA_SCREENSHOT_DPI) return true;

  return SCREENSHOT_FILE.test(clipboard.read('public.file-url'));
};

const readClipboardImage = (): null | { formats: string[]; image: NativeImage; size: ImageSize; source: Buffer } => {
  const formats = clipboard.availableFormats();
  const png = clipboard.readBuffer('public.png');
  const dims = pngDimensions(png);
  if (dims) return { formats, image: nativeImage.createFromBuffer(png), size: dims, source: png };

  if (!formats.some((format) => format.startsWith('image/')) || formats.includes('text/uri-list')) return null;

  const image = clipboard.readImage();
  if (image.isEmpty()) return null;

  return { formats, image, size: image.getSize(), source: image.toPNG() };
};

export const downscaleClipboard = (): DownscaleResult | null => {
  const probe = readClipboardImage();
  if (!probe) return null;

  const { formats, image, size, source } = probe;
  const longest = Math.max(size.width, size.height);
  if (longest <= CLIPBOARD_MAX_EDGE) return null;

  if (!isScreenshot(source, formats)) return null;

  const hash = fingerprint(source);
  if (seen.has(hash)) return null;
  remember(hash);

  const scale = CLIPBOARD_MAX_EDGE / longest;
  const to: ImageSize = {
    height: Math.max(1, Math.round(size.height * scale)),
    width: Math.max(1, Math.round(size.width * scale))
  };

  const resized = image.resize({ height: to.height, quality: 'best', width: to.width });
  const out = resized.toPNG();
  clipboard.writeImage(resized);

  return { bytes: { from: source.length, to: out.length }, from: size, to };
};

let timer: NodeJS.Timeout | null = null;

const tick = (): void => {
  try {
    const result = downscaleClipboard();
    if (result) {
      log.info('[clipboard] downscaled', result);
      BrowserWindow.getAllWindows().forEach((window) => window.webContents.send('clipboard:downscaled', result));
    }
  } catch (error) {
    log.warn('[clipboard] downscale failed', error);
  }
};

export const syncClipboardWatcher = (enabled: boolean): void => {
  if (enabled && !timer) {
    tick();
    timer = setInterval(tick, CLIPBOARD_POLL_MS);
  } else if (!enabled && timer) {
    clearInterval(timer);
    timer = null;
  }
};

export const stopClipboardWatcher = (): void => syncClipboardWatcher(false);

export const initClipboardDownscale = (): void => {
  syncClipboardWatcher(Boolean(settings.get('appSettings')?.clipboardDownscale));

  settings.onDidChange('appSettings', (next) => syncClipboardWatcher(Boolean(next?.clipboardDownscale)));
};
