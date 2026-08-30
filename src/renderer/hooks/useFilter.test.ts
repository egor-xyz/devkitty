import { beforeEach, describe, expect, it } from 'vitest';

import { useFilter } from './useFilter';

describe('useFilter', () => {
  beforeEach(() => {
    useFilter.setState({ query: '' });
  });

  it('should start with an empty query', () => {
    expect(useFilter.getState().query).toBe('');
  });

  it('should update the query when setQuery is called', () => {
    useFilter.getState().setQuery('foo');

    expect(useFilter.getState().query).toBe('foo');
  });

  it('should reset the query to an empty string when clear is called', () => {
    useFilter.getState().setQuery('foo');

    useFilter.getState().clear();

    expect(useFilter.getState().query).toBe('');
  });
});
