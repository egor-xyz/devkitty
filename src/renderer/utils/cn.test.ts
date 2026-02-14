import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
  it('should merge simple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional class names', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('should merge conflicting Tailwind classes', () => {
    // twMerge should keep only the last conflicting class
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('should handle empty inputs', () => {
    expect(cn()).toBe('');
  });

  it('should handle null and undefined values', () => {
    expect(cn('foo', null, undefined, 'bar')).toBe('foo bar');
  });

  it('should handle arrays of class names', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('should handle object syntax from clsx', () => {
    expect(cn({ bar: false, foo: true })).toBe('foo');
  });

  it('should merge conflicting Tailwind color classes', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('should handle mixed inputs', () => {
    expect(cn('base', ['array-class'], { 'object-class': true })).toBe('base array-class object-class');
  });
});
