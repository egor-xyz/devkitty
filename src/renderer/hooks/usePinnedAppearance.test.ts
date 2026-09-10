// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WindowAppearance, WindowOpacity } from 'types/window';

import { usePinnedAppearance } from './usePinnedAppearance';

const windowBridge = window.bridge.window;

const deferred = <T,>() => {
  let reject!: (reason?: unknown) => void;
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    reject = promiseReject;
    resolve = promiseResolve;
  });
  return { promise, reject, resolve };
};

const flush = async () => {
  await act(() => Promise.resolve());
};

describe('usePinnedAppearance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePinnedAppearance.setState({
      alwaysOnTop: false,
      initialized: false,
      opacity: 1
    });
    vi.mocked(windowBridge.getPinnedAppearance).mockResolvedValue({ alwaysOnTop: false, opacity: 1 });
    vi.mocked(windowBridge.setPinnedAppearance).mockImplementation((alwaysOnTop: boolean, opacity: WindowOpacity) => Promise.resolve({
      alwaysOnTop,
      opacity
    }));
  });

  it('initializes once and exposes the native appearance', async () => {
    vi.mocked(windowBridge.getPinnedAppearance).mockResolvedValue({ alwaysOnTop: true, opacity: 0.73 });
    const { result } = renderHook(() => usePinnedAppearance());

    await act(async () => Promise.all([result.current.initialize(), result.current.initialize()]));

    expect(windowBridge.getPinnedAppearance).toHaveBeenCalledTimes(1);
    expect(result.current).toMatchObject({ alwaysOnTop: true, initialized: true, opacity: 0.73 });
  });

  it('keeps one request in flight and sends only the latest pending value', async () => {
    const first = deferred<WindowAppearance>();
    vi.mocked(windowBridge.getPinnedAppearance).mockResolvedValue({ alwaysOnTop: true, opacity: 0.5 });
    vi.mocked(windowBridge.setPinnedAppearance)
      .mockImplementationOnce(() => first.promise)
      .mockImplementation((alwaysOnTop: boolean, opacity: WindowOpacity) => Promise.resolve({ alwaysOnTop, opacity }));
    const { result } = renderHook(() => usePinnedAppearance());
    await act(() => result.current.initialize());

    act(() => {
      result.current.setOpacity(0.51);
      result.current.setOpacity(0.52);
      result.current.setOpacity(0.53);
    });
    expect(windowBridge.setPinnedAppearance).toHaveBeenCalledTimes(1);

    first.resolve({ alwaysOnTop: true, opacity: 0.51 });
    await flush();
    await flush();

    expect(windowBridge.setPinnedAppearance).toHaveBeenCalledTimes(2);
    expect(windowBridge.setPinnedAppearance).toHaveBeenLastCalledWith(true, 0.53);
    expect(result.current.opacity).toBe(0.53);
  });

  it('resyncs after the latest request fails', async () => {
    vi.mocked(windowBridge.getPinnedAppearance)
      .mockResolvedValueOnce({ alwaysOnTop: true, opacity: 0.5 })
      .mockResolvedValueOnce({ alwaysOnTop: true, opacity: 0.4 });
    vi.mocked(windowBridge.setPinnedAppearance).mockRejectedValue(new Error('IPC failed'));
    const { result } = renderHook(() => usePinnedAppearance());
    await act(() => result.current.initialize());

    act(() => result.current.setOpacity(0.51));
    await flush();
    await flush();

    expect(windowBridge.getPinnedAppearance).toHaveBeenCalledTimes(2);
    expect(result.current.opacity).toBe(0.4);
  });

  it('does not overwrite a newer choice during failure resync', async () => {
    const first = deferred<WindowAppearance>();
    const resync = deferred<WindowAppearance>();
    vi.mocked(windowBridge.getPinnedAppearance)
      .mockResolvedValueOnce({ alwaysOnTop: true, opacity: 0.5 })
      .mockImplementationOnce(() => resync.promise);
    vi.mocked(windowBridge.setPinnedAppearance)
      .mockImplementationOnce(() => first.promise)
      .mockImplementation((alwaysOnTop: boolean, opacity: WindowOpacity) => Promise.resolve({ alwaysOnTop, opacity }));
    const { result } = renderHook(() => usePinnedAppearance());
    await act(() => result.current.initialize());

    act(() => result.current.setOpacity(0.51));
    first.reject(new Error('IPC failed'));
    await flush();
    act(() => result.current.setOpacity(0.52));
    resync.resolve({ alwaysOnTop: true, opacity: 0.4 });
    await flush();
    await flush();

    expect(result.current.opacity).toBe(0.52);
    expect(windowBridge.setPinnedAppearance).toHaveBeenLastCalledWith(true, 0.52);
  });

  it('remembers logical opacity while unpinned', async () => {
    vi.mocked(windowBridge.getPinnedAppearance).mockResolvedValue({ alwaysOnTop: true, opacity: 0.65 });
    const { result } = renderHook(() => usePinnedAppearance());
    await act(() => result.current.initialize());

    act(() => result.current.togglePin());
    await flush();
    expect(result.current).toMatchObject({ alwaysOnTop: false, opacity: 0.65 });

    act(() => result.current.togglePin());
    await flush();
    expect(windowBridge.setPinnedAppearance).toHaveBeenLastCalledWith(true, 0.65);
  });
});
