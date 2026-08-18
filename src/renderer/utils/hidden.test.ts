import { describe, expect, it } from 'vitest';

import { addHidden, parseHidden, projectIdOf, removeHidden } from './hidden';

describe('parseHidden', () => {
  it('should return nothing for missing storage', () => {
    expect(parseHidden(null)).toEqual([]);
  });

  it('should return nothing for unparsable storage', () => {
    expect(parseHidden('{oops')).toEqual([]);
  });

  it('should keep labelled entries as they are', () => {
    expect(parseHidden('[{"id":1,"label":"Unit Tests #4"}]')).toEqual([{ id: 1, label: 'Unit Tests #4' }]);
  });

  it('should upgrade legacy bare ids so nothing hidden before is stranded', () => {
    expect(parseHidden('[7]')).toEqual([{ id: 7, label: '#7' }]);
  });

  it('should drop entries without a numeric id', () => {
    expect(parseHidden('[{"label":"orphan"}]')).toEqual([]);
  });

  it('should fall back to the id when a label is empty', () => {
    expect(parseHidden('[{"id":3,"label":""}]')).toEqual([{ id: 3, label: '#3' }]);
  });
});

describe('addHidden', () => {
  it('should append a new entry', () => {
    expect(addHidden([], { id: 1, label: 'a' })).toEqual([{ id: 1, label: 'a' }]);
  });

  it('should ignore an id that is already hidden', () => {
    const entries = [{ id: 1, label: 'a' }];

    expect(addHidden(entries, { id: 1, label: 'b' })).toBe(entries);
  });
});

describe('removeHidden', () => {
  it('should drop only the given id', () => {
    const entries = [
      { id: 1, label: 'a' },
      { id: 2, label: 'b' }
    ];

    expect(removeHidden(entries, 1)).toEqual([{ id: 2, label: 'b' }]);
  });
});

describe('projectIdOf', () => {
  it('should read the project id out of either key', () => {
    expect(projectIdOf('hiddenActions:abc')).toBe('abc');
    expect(projectIdOf('hiddenPulls:abc')).toBe('abc');
  });
});
