// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useWindowActive } from './useWindowActive';

const setHidden = (value: boolean) => {
  Object.defineProperty(document, 'hidden', { configurable: true, value });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('useWindowActive', () => {
  afterEach(() => {
    setHidden(false);
  });

  it('goes false on blur and true again on focus', () => {
    const { result } = renderHook(() => useWindowActive());

    act(() => {
      window.dispatchEvent(new Event('blur'));
    });
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(result.current).toBe(true);
  });

  it('re-reads document.hasFocus() when the first listener subscribes', () => {
    const original = document.hasFocus;
    try {
      document.hasFocus = () => false;
      const unfocused = renderHook(() => useWindowActive());
      expect(unfocused.result.current).toBe(false);
      unfocused.unmount();

      document.hasFocus = () => true;
      const focusedHook = renderHook(() => useWindowActive());
      expect(focusedHook.result.current).toBe(true);
      focusedHook.unmount();
    } finally {
      document.hasFocus = original;
    }
  });

  it('is true after a focus event and false after a blur event', () => {
    const { result } = renderHook(() => useWindowActive());

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('blur'));
    });
    expect(result.current).toBe(false);
  });

  it('is false while the document is hidden even when focused', () => {
    const { result } = renderHook(() => useWindowActive());

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(result.current).toBe(true);

    act(() => {
      setHidden(true);
    });
    expect(result.current).toBe(false);

    act(() => {
      setHidden(false);
    });
    expect(result.current).toBe(true);
  });
});
