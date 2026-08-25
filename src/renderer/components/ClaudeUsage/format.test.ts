import { describe, expect, it } from 'vitest';

import { formatCountdown, formatTokens, meterColor, modelLabel } from './format';

describe('meterColor', () => {
  it('is calm below 60%, amber to 85%, red above', () => {
    expect(meterColor(0)).toBe('#238551');
    expect(meterColor(0.59)).toBe('#238551');
    expect(meterColor(0.6)).toBe('#C87619');
    expect(meterColor(0.84)).toBe('#C87619');
    expect(meterColor(0.85)).toBe('#CD4246');
    expect(meterColor(1)).toBe('#CD4246');
  });
});

describe('formatTokens', () => {
  it('scales to K/M/B', () => {
    expect(formatTokens(950)).toBe('950');
    expect(formatTokens(1200)).toBe('1.2K');
    expect(formatTokens(2_100_000)).toBe('2.1M');
    expect(formatTokens(2_116_363_302)).toBe('2.1B');
  });
});

describe('formatCountdown', () => {
  it('shows the two largest non-zero units', () => {
    expect(formatCountdown(0)).toBe('now');
    expect(formatCountdown(-5)).toBe('now');
    expect(formatCountdown(30_000)).toBe('<1m');
    expect(formatCountdown(14 * 60_000)).toBe('14m');
    expect(formatCountdown((2 * 60 + 14) * 60_000)).toBe('2h 14m');
    expect(formatCountdown(3 * 60 * 60_000)).toBe('3h');
    expect(formatCountdown((3 * 24 + 4) * 60 * 60_000)).toBe('3d 4h');
    expect(formatCountdown(3 * 24 * 60 * 60_000)).toBe('3d');
  });
});

describe('modelLabel', () => {
  it('maps known ids and tolerates date suffixes', () => {
    expect(modelLabel('claude-opus-5')).toBe('Opus 5');
    expect(modelLabel('claude-haiku-4-5-20251001')).toBe('Haiku');
    expect(modelLabel('claude-future-9')).toBe('future-9');
  });
});
