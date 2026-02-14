import { describe, it, expect } from 'vitest';

import { shellNames } from './shells';

describe('shells', () => {
  describe('shellNames', () => {
    it('should be a non-empty array', () => {
      expect(shellNames.length).toBeGreaterThan(0);
    });

    it('should contain common shells', () => {
      expect(shellNames).toContain('Terminal');
      expect(shellNames).toContain('iTerm2');
      expect(shellNames).toContain('Warp');
    });

    it('should contain only strings', () => {
      shellNames.forEach((name) => {
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
      });
    });

    it('should not contain duplicates', () => {
      const uniqueNames = new Set(shellNames);
      expect(uniqueNames.size).toBe(shellNames.length);
    });
  });
});
