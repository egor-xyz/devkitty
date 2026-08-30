// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useMountEffect } from './useMountEffect';

describe('useMountEffect', () => {
  it('should call the effect callback exactly once when the hook mounts', () => {
    const effectCallback = vi.fn();

    renderHook(() => useMountEffect(effectCallback));

    expect(effectCallback).toHaveBeenCalledTimes(1);
  });

  it('should invoke a cleanup function returned by the callback exactly once when the component unmounts', () => {
    const cleanup = vi.fn();
    const effectCallback = vi.fn(() => cleanup);

    const { unmount } = renderHook(() => useMountEffect(effectCallback));

    expect(cleanup).not.toHaveBeenCalled();

    act(() => {
      unmount();
    });

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('should not call the effect callback again when the hook re-renders', () => {
    const effectCallback = vi.fn();

    const { rerender } = renderHook(() => useMountEffect(effectCallback));

    expect(effectCallback).toHaveBeenCalledTimes(1);

    rerender();

    expect(effectCallback).toHaveBeenCalledTimes(1);
  });
});
