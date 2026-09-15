import { describe, expect, it } from 'vitest';

import { formatDuration, getRunDuration } from './workflowDuration';

describe('workflow duration', () => {
  it('uses only the current attempt for a completed re-run', () => {
    expect(getRunDuration({
      conclusion: 'success',
      created_at: '2026-09-15T10:00:00.000Z',
      run_started_at: '2026-09-15T10:20:00.000Z',
      updated_at: '2026-09-15T10:28:12.000Z'
    })).toBe('8m 12s');
  });

  it('uses the current attempt start and the current time for a live re-run', () => {
    expect(getRunDuration({
      conclusion: null,
      created_at: '2026-09-15T10:00:00.000Z',
      run_started_at: '2026-09-15T10:20:00.000Z',
      updated_at: '2026-09-15T10:00:00.000Z'
    }, Date.parse('2026-09-15T10:21:05.000Z'))).toBe('1m 5s');
  });

  it('falls back to the creation time for old API data', () => {
    expect(getRunDuration({
      conclusion: 'success',
      created_at: '2026-09-15T10:00:00.000Z',
      run_started_at: null,
      updated_at: '2026-09-15T10:02:03.000Z'
    })).toBe('2m 3s');
  });

  it.each([
    [undefined, '2026-09-15T10:02:00.000Z'],
    ['bad start', '2026-09-15T10:02:00.000Z'],
    ['2026-09-15T10:00:00.000Z', 'bad end'],
    ['2026-09-15T10:02:00.000Z', '2026-09-15T10:00:00.000Z']
  ])('returns null for bad duration dates', (start, end) => {
    expect(formatDuration(start, end)).toBeNull();
  });

  it('returns null when a completed run has no end time', () => {
    expect(getRunDuration({
      conclusion: 'success',
      created_at: '2026-09-15T10:00:00.000Z',
      run_started_at: '2026-09-15T10:01:00.000Z',
      updated_at: null as unknown as string
    })).toBeNull();
  });

  it('keeps the existing job duration text', () => {
    expect(formatDuration('2026-09-15T10:00:00.000Z', '2026-09-15T11:02:03.000Z')).toBe('1h 2m');
    expect(formatDuration('2026-09-15T10:00:00.000Z', undefined, Date.parse('2026-09-15T10:00:09.000Z'))).toBe('9s');
  });
});
