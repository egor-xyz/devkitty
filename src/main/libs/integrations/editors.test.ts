import { describe, it, expect } from 'vitest';

import { editorNames } from './editors';

describe('editors', () => {
  describe('editorNames', () => {
    it('should be a non-empty array', () => {
      expect(editorNames.length).toBeGreaterThan(0);
    });

    it('should contain common editors', () => {
      expect(editorNames).toContain('Visual Studio Code');
      expect(editorNames).toContain('Xcode');
      expect(editorNames).toContain('WebStorm');
      expect(editorNames).toContain('Cursor');
      expect(editorNames).toContain('Zed');
    });

    it('should contain only strings', () => {
      editorNames.forEach((name) => {
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
      });
    });

    it('should not contain duplicates', () => {
      const uniqueNames = new Set(editorNames);
      expect(uniqueNames.size).toBe(editorNames.length);
    });
  });
});
