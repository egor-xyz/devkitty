import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn()
  }
}));

import fs from 'fs';

import { readReportedUsage } from './lastUsage';

const mockReadFileSync = vi.mocked(fs.readFileSync);

describe('readReportedUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when the usage file does not exist on disk', () => {
    mockReadFileSync.mockImplementation(() => {
      const error = new Error('ENOENT: no such file or directory') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      throw error;
    });

    const result = readReportedUsage('/config/dir');

    expect(result).toBeNull();
  });

  it('returns null when the file contains malformed JSON that cannot be parsed', () => {
    mockReadFileSync.mockReturnValue('{ this is not valid json');

    const result = readReportedUsage('/config/dir');

    expect(result).toBeNull();
  });

  it('returns null when the parsed JSON has no rate_limits field', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ capturedAt: 1700000000 }));

    const result = readReportedUsage('/config/dir');

    expect(result).toBeNull();
  });

  it('returns null when neither the five-hour nor the seven-day window can be parsed', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        capturedAt: 1700000000,
        rate_limits: {
          five_hour: { used_percentage: 'not-a-number' },
          seven_day: null
        }
      })
    );

    const result = readReportedUsage('/config/dir');

    expect(result).toBeNull();
  });

  it('maps a valid usage file into a fully populated result with both windows', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        capturedAt: 1700000000,
        rate_limits: {
          five_hour: { used_percentage: 42, resets_at: 1700003600 },
          seven_day: { used_percentage: 87, resets_at: 1700600000 }
        }
      })
    );

    const result = readReportedUsage('/config/dir');

    expect(result).toEqual({
      capturedAt: 1700000000 * 1000,
      fiveHour: { pct: 0.42, resetsAt: 1700003600 * 1000 },
      sevenDay: { pct: 0.87, resetsAt: 1700600000 * 1000 }
    });
  });

  it('reads the usage file from last-usage.json inside the given config directory', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        capturedAt: 1700000000,
        rate_limits: {
          five_hour: { used_percentage: 10, resets_at: 1700003600 }
        }
      })
    );

    readReportedUsage('/some/config/dir');

    expect(mockReadFileSync).toHaveBeenCalledWith('/some/config/dir/last-usage.json', 'utf8');
  });

  it('returns only the five-hour window when the seven-day window is absent', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        capturedAt: 1700000000,
        rate_limits: {
          five_hour: { used_percentage: 10, resets_at: 1700003600 }
        }
      })
    );

    const result = readReportedUsage('/config/dir');

    expect(result).toEqual({
      capturedAt: 1700000000 * 1000,
      fiveHour: { pct: 0.1, resetsAt: 1700003600 * 1000 },
      sevenDay: undefined
    });
  });

  it('clamps a used_percentage above 100 down to a pct of 1', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        capturedAt: 1700000000,
        rate_limits: {
          five_hour: { used_percentage: 250, resets_at: 1700003600 }
        }
      })
    );

    const result = readReportedUsage('/config/dir');

    expect(result?.fiveHour?.pct).toBe(1);
  });

  it('clamps a negative used_percentage up to a pct of 0', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        capturedAt: 1700000000,
        rate_limits: {
          five_hour: { used_percentage: -20, resets_at: 1700003600 }
        }
      })
    );

    const result = readReportedUsage('/config/dir');

    expect(result?.fiveHour?.pct).toBe(0);
  });

  it('converts a numeric epoch-seconds resets_at value to epoch milliseconds', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        capturedAt: 1700000000,
        rate_limits: {
          five_hour: { used_percentage: 10, resets_at: 1700003600 }
        }
      })
    );

    const result = readReportedUsage('/config/dir');

    expect(result?.fiveHour?.resetsAt).toBe(1700003600 * 1000);
  });

  it('converts a numeric-string ISO date resets_at value using Date.parse', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        capturedAt: 1700000000,
        rate_limits: {
          five_hour: { used_percentage: 10, resets_at: '2023-11-14T22:13:20.000Z' }
        }
      })
    );

    const result = readReportedUsage('/config/dir');

    expect(result?.fiveHour?.resetsAt).toBe(Date.parse('2023-11-14T22:13:20.000Z'));
  });

  it('falls back to 0 for an unparseable garbage string resets_at value', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        capturedAt: 1700000000,
        rate_limits: {
          five_hour: { used_percentage: 10, resets_at: 'not-a-real-date' }
        }
      })
    );

    const result = readReportedUsage('/config/dir');

    expect(result?.fiveHour?.resetsAt).toBe(0);
  });

  it('falls back to 0 for capturedAt when it is neither a number nor a string', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        capturedAt: null,
        rate_limits: {
          five_hour: { used_percentage: 10, resets_at: 1700003600 }
        }
      })
    );

    const result = readReportedUsage('/config/dir');

    expect(result?.capturedAt).toBe(0);
  });

  it('returns null when a window value is not an object', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        capturedAt: 1700000000,
        rate_limits: {
          five_hour: 'not-an-object'
        }
      })
    );

    const result = readReportedUsage('/config/dir');

    expect(result).toBeNull();
  });
});
