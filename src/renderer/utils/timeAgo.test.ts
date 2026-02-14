import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { timeAgo } from './timeAgo';

describe('timeAgo', () => {
  beforeEach(() => {
    // Fix the current time to 2024-01-15T12:00:00.000Z for deterministic tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return seconds ago for very recent times', () => {
    const date = new Date('2024-01-15T11:59:30.000Z').toISOString(); // 30 seconds ago
    expect(timeAgo(date)).toBe('30 seconds ago');
  });

  it('should return minutes ago for times within the last hour', () => {
    const date = new Date('2024-01-15T11:45:00.000Z').toISOString(); // 15 minutes ago
    expect(timeAgo(date)).toBe('15 minutes ago');
  });

  it('should return hours ago for times within the last day', () => {
    const date = new Date('2024-01-15T09:00:00.000Z').toISOString(); // 3 hours ago
    expect(timeAgo(date)).toBe('3 hours ago');
  });

  it('should return days ago for times within the last 30 days', () => {
    const date = new Date('2024-01-10T12:00:00.000Z').toISOString(); // 5 days ago
    expect(timeAgo(date)).toBe('5 days ago');
  });

  it('should return months ago for times within the last year', () => {
    const date = new Date('2023-10-15T12:00:00.000Z').toISOString(); // ~3 months ago
    expect(timeAgo(date)).toBe('3 months ago');
  });

  it('should return years ago for times older than a year', () => {
    const date = new Date('2022-01-15T12:00:00.000Z').toISOString(); // 2 years ago
    expect(timeAgo(date)).toBe('2 years ago');
  });

  it('should handle 0 seconds (just now)', () => {
    const date = new Date('2024-01-15T12:00:00.000Z').toISOString(); // exactly now
    expect(timeAgo(date)).toBe('0 seconds ago');
  });

  it('should handle 1 minute ago', () => {
    const date = new Date('2024-01-15T11:59:00.000Z').toISOString(); // 1 minute ago
    expect(timeAgo(date)).toBe('1 minutes ago');
  });

  it('should handle 1 hour ago', () => {
    const date = new Date('2024-01-15T11:00:00.000Z').toISOString(); // 1 hour ago
    expect(timeAgo(date)).toBe('1 hours ago');
  });

  it('should return hours for exactly 24 hours (boundary)', () => {
    const date = new Date('2024-01-14T12:00:00.000Z').toISOString(); // exactly 24h = 86400s
    // The condition is secondsPast <= 86400, so exactly 24h returns hours
    expect(timeAgo(date)).toBe('24 hours ago');
  });

  it('should return days for just over 24 hours', () => {
    const date = new Date('2024-01-14T11:59:59.000Z').toISOString(); // 24h + 1s
    expect(timeAgo(date)).toBe('1 days ago');
  });
});
