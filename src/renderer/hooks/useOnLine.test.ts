// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOnLine } from './useOnLine';

describe('useOnLine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the current navigator online status as the initial value', () => {
    const { result } = renderHook(() => useOnLine());

    expect(result.current.onLine).toBe(navigator.onLine);
  });

  it('should flip the online status to false when the window dispatches an offline event', () => {
    const { result } = renderHook(() => useOnLine());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.onLine).toBe(false);
  });

  it('should flip the online status back to true when the window dispatches an online event', () => {
    const { result } = renderHook(() => useOnLine());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.onLine).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.onLine).toBe(true);
  });

  it('should remove the online and offline window event listeners when the component unmounts', () => {
    const { unmount } = renderHook(() => useOnLine());

    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});
