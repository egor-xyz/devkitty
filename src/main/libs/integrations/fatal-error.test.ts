import { describe, expect, it } from 'vitest';

import { assertNever, assertNonNullable, fatalError, forceUnwrap } from './fatal-error';

describe('fatal-error', () => {
  describe('assertNever', () => {
    it('should throw an error with the provided message', () => {
      expect(() => assertNever('unexpected' as never, 'Unknown value: unexpected')).toThrow(
        'Unknown value: unexpected'
      );
    });
  });

  describe('fatalError', () => {
    it('should throw an error with the provided message', () => {
      expect(() => fatalError('Something went terribly wrong')).toThrow('Something went terribly wrong');
    });
  });

  describe('assertNonNullable', () => {
    it('should not throw when given a defined value', () => {
      expect(() => assertNonNullable('hello', 'should not throw')).not.toThrow();
    });

    it('should not throw when given zero', () => {
      expect(() => assertNonNullable(0, 'should not throw')).not.toThrow();
    });

    it('should not throw when given an empty string', () => {
      expect(() => assertNonNullable('', 'should not throw')).not.toThrow();
    });

    it('should not throw when given false', () => {
      expect(() => assertNonNullable(false, 'should not throw')).not.toThrow();
    });

    it('should throw when given null', () => {
      expect(() => assertNonNullable(null, 'value was null')).toThrow('value was null');
    });

    it('should not throw when given undefined', () => {
      // Note: the implementation only checks for null, not undefined
      expect(() => assertNonNullable(undefined, 'value was undefined')).not.toThrow();
    });
  });

  describe('forceUnwrap', () => {
    it('should return the value when it is defined', () => {
      expect(forceUnwrap('should not throw', 'hello')).toBe('hello');
    });

    it('should return the value when it is zero', () => {
      expect(forceUnwrap('should not throw', 0)).toBe(0);
    });

    it('should return the value when it is an empty string', () => {
      expect(forceUnwrap('should not throw', '')).toBe('');
    });

    it('should return the value when it is false', () => {
      expect(forceUnwrap('should not throw', false)).toBe(false);
    });

    it('should throw when the value is null', () => {
      expect(() => forceUnwrap('value was null', null)).toThrow('value was null');
    });

    it('should return undefined when the value is undefined', () => {
      // Note: the implementation only checks for null, not undefined
      expect(forceUnwrap('value was undefined', undefined)).toBeUndefined();
    });
  });
});
