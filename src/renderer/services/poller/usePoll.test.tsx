// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { subscribeMock } = vi.hoisted(() => ({ subscribeMock: vi.fn() }));

vi.mock('./coordinator', () => ({
  subscribe: (...args: unknown[]) => subscribeMock(...args)
}));

import { usePoll } from './usePoll';

type Spec = { fetch: () => Promise<unknown>; interval: (d?: unknown) => number; key: string };

afterEach(() => {
  subscribeMock.mockReset();
});

describe('usePoll', () => {
  it('starts in a loading state and transitions to data once the coordinator delivers onData', () => {
    let capturedOnData: ((d: unknown) => void) | undefined;
    subscribeMock.mockImplementation((_spec: Spec, onData: (d: unknown) => void) => {
      capturedOnData = onData;
      return vi.fn();
    });

    const { result } = renderHook(() => usePoll({ fetch: vi.fn(), interval: vi.fn(), key: 'k1' }));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeUndefined();

    act(() => {
      capturedOnData?.({ n: 1 });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual({ n: 1 });
    expect(result.current.error).toBeUndefined();
  });

  it('transitions loading to false and sets error when the coordinator delivers onError', () => {
    let capturedOnError: ((e: unknown) => void) | undefined;
    subscribeMock.mockImplementation((_spec: Spec, _onData: unknown, onError: (e: unknown) => void) => {
      capturedOnError = onError;
      return vi.fn();
    });

    const { result } = renderHook(() => usePoll({ fetch: vi.fn(), interval: vi.fn(), key: 'k1e' }));

    act(() => {
      capturedOnError?.(new Error('nope'));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('does not resubscribe when spec.key is unchanged across re-renders, but the latest fetch/interval take effect', () => {
    subscribeMock.mockImplementation(() => vi.fn());

    const fetch1 = vi.fn().mockResolvedValue(undefined);
    const interval1 = vi.fn().mockReturnValue(1000);
    const { rerender } = renderHook((spec: Spec) => usePoll(spec), {
      initialProps: { fetch: fetch1, interval: interval1, key: 'k2' }
    });

    expect(subscribeMock).toHaveBeenCalledTimes(1);
    const liveSpec = subscribeMock.mock.calls[0][0] as Spec;

    const fetch2 = vi.fn().mockResolvedValue(undefined);
    const interval2 = vi.fn().mockReturnValue(2000);
    rerender({ fetch: fetch2, interval: interval2, key: 'k2' });

    // Same key -> still exactly one subscribe call.
    expect(subscribeMock).toHaveBeenCalledTimes(1);

    // But the spec object handed to the coordinator at subscribe-time proxies
    // through to the *latest* fetch/interval closures.
    liveSpec.fetch();
    expect(fetch2).toHaveBeenCalledTimes(1);
    expect(fetch1).not.toHaveBeenCalled();

    liveSpec.interval(undefined);
    expect(interval2).toHaveBeenCalledTimes(1);
    expect(interval1).not.toHaveBeenCalled();
  });

  it('resubscribes when spec.key changes', () => {
    subscribeMock.mockImplementation(() => vi.fn());

    const { rerender } = renderHook((spec: Spec) => usePoll(spec), {
      initialProps: { fetch: vi.fn(), interval: vi.fn(), key: 'k3a' }
    });
    expect(subscribeMock).toHaveBeenCalledTimes(1);

    rerender({ fetch: vi.fn(), interval: vi.fn(), key: 'k3b' });
    expect(subscribeMock).toHaveBeenCalledTimes(2);
  });

  it('unsubscribes on unmount', () => {
    const unsubscribe = vi.fn();
    subscribeMock.mockImplementation(() => unsubscribe);

    const { unmount } = renderHook(() => usePoll({ fetch: vi.fn(), interval: vi.fn(), key: 'k4' }));

    expect(unsubscribe).not.toHaveBeenCalled();
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('subscribes only while enabled and keeps the last value', () => {
    const unsubscribe = vi.fn();
    let onData: ((value: unknown) => void) | undefined;
    subscribeMock.mockImplementation((_spec: Spec, callback: (value: unknown) => void) => {
      onData = callback;
      return unsubscribe;
    });
    const spec = { fetch: vi.fn(), interval: vi.fn(), key: 'visible-row' };
    const { rerender, result } = renderHook(({ enabled }) => usePoll(spec, enabled), {
      initialProps: { enabled: false }
    });
    expect(subscribeMock).not.toHaveBeenCalled();

    rerender({ enabled: true });
    expect(subscribeMock).toHaveBeenCalledTimes(1);
    act(() => onData?.({ n: 1 }));
    rerender({ enabled: false });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ n: 1 });

    rerender({ enabled: true });
    expect(subscribeMock).toHaveBeenCalledTimes(2);
  });

  describe('render bailout', () => {
    const setup = () => {
      let onData: ((d: unknown) => void) | undefined;
      let onError: ((e: unknown) => void) | undefined;
      subscribeMock.mockImplementation((_spec: Spec, d: (d: unknown) => void, e: (e: unknown) => void) => {
        onData = d;
        onError = e;
        return vi.fn();
      });
      // Count commits, not function calls: React may call the component once more
      // before it bails out of an identical state, but it never commits it.
      const renders = { count: 0 };
      const hook = renderHook(() => {
        const result = usePoll({ fetch: vi.fn(), interval: vi.fn(), key: 'kb' });
        useEffect(() => {
          renders.count += 1;
        });
        return result;
      });

      return { deliver: (d: unknown) => act(() => onData?.(d)), fail: (e: unknown) => act(() => onError?.(e)), hook, renders };
    };

    it('does not re-render when a deep-equal object is delivered again', () => {
      const { deliver, hook, renders } = setup();

      deliver({ n: 1 });
      const after = renders.count;
      const { data } = hook.result.current;

      deliver({ n: 1 });

      expect(renders.count).toBe(after);
      expect(hook.result.current.data).toBe(data);
    });

    it('re-renders when the delivered object changes', () => {
      const { deliver, hook, renders } = setup();

      deliver({ n: 1 });
      const after = renders.count;

      deliver({ n: 2 });

      expect(renders.count).toBe(after + 1);
      expect(hook.result.current.data).toEqual({ n: 2 });
    });

    it('clears an error when equal data arrives after it', () => {
      const { deliver, fail, hook } = setup();

      deliver({ n: 1 });
      fail(new Error('boom'));
      expect(hook.result.current.error).toBeInstanceOf(Error);

      deliver({ n: 1 });

      expect(hook.result.current.error).toBeUndefined();
      expect(hook.result.current.loading).toBe(false);
    });
  });
});
