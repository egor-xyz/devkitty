import { describe, expect, it } from 'vitest';

import { formatBytes } from './formatBytes';

describe('formatBytes', () => {
  it('formats bytes below 1 KB', () => {
    expect(formatBytes(812)).toBe('812 B');
  });

  it('formats kilobytes as an integer', () => {
    expect(formatBytes(240 * 1024)).toBe('240 KB');
  });

  it('formats megabytes with one decimal', () => {
    expect(formatBytes(1.8 * 1024 * 1024)).toBe('1.8 MB');
  });

  it('formats zero bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });
});
