// @vitest-environment jsdom
import type * as Blueprint from '@blueprintjs/core';
import type { PopoverProps } from '@blueprintjs/core';

import { act, fireEvent, render, screen } from '@testing-library/react';
import { usePinnedAppearance } from 'renderer/hooks/usePinnedAppearance';
import type { WindowOpacity } from 'types/window';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const capturedPopoverProps = vi.hoisted<{ current?: PopoverProps }>(() => ({}));

vi.mock('@blueprintjs/core', async (importOriginal) => {
  const actual = await importOriginal() as typeof Blueprint;
  const React = await import('react');
  return {
    ...actual,
    Popover: (props: PopoverProps) => {
      capturedPopoverProps.current = props;
      return React.createElement(actual.Popover, props);
    }
  };
});

import { AlwaysOnTopControl } from './AlwaysOnTopControl';

const windowBridge = window.bridge.window;

const flush = async () => {
  await act(() => Promise.resolve());
};

const pin = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Toggle always on top' }));
  await flush();
};

const openSlider = async (event: 'focus' | 'hover' = 'hover') => {
  const pinButton = screen.getByRole('button', { name: 'Toggle always on top' });
  if (event === 'focus') fireEvent.focus(pinButton);
  else fireEvent.mouseEnter(pinButton);
  await act(() => vi.advanceTimersByTimeAsync(300));
  return screen.getByRole('slider', { name: 'Window opacity' });
};

describe('AlwaysOnTopControl', () => {
  beforeEach(() => {
    vi.useFakeTimers();
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

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('keeps the pin icon and hides the slider while unpinned', async () => {
    render(<AlwaysOnTopControl />);
    await flush();

    const pinButton = screen.getByRole('button', { name: 'Toggle always on top' });
    expect(pinButton.querySelector('svg')).toBeTruthy();
    fireEvent.mouseEnter(pinButton);
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(screen.queryByRole('slider', { name: 'Window opacity' })).toBeNull();
  });

  it('shows the mounted pinned opacity on hover and focus', async () => {
    vi.mocked(windowBridge.getPinnedAppearance).mockResolvedValue({ alwaysOnTop: true, opacity: 0.73 });
    const { unmount } = render(<AlwaysOnTopControl />);
    await flush();

    const slider = await openSlider();
    expect(slider.getAttribute('aria-valuenow')).toBe('73');
    expect(screen.getByText('Window opacity')).toBeTruthy();
    expect(screen.getByText('40%')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();

    unmount();
    render(<AlwaysOnTopControl />);
    await flush();
    expect(await openSlider('focus')).toBeTruthy();
  });

  it('hides the popover on unpin and restores the chosen opacity on repin', async () => {
    vi.mocked(windowBridge.getPinnedAppearance).mockResolvedValue({ alwaysOnTop: true, opacity: 0.65 });
    render(<AlwaysOnTopControl />);
    await flush();
    await openSlider();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle always on top' }));
    await flush();
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(windowBridge.setPinnedAppearance).toHaveBeenLastCalledWith(false, 0.65);
    expect(screen.queryByRole('slider', { name: 'Window opacity' })).toBeNull();

    await pin();
    expect(windowBridge.setPinnedAppearance).toHaveBeenLastCalledWith(true, 0.65);
  });

  it('sends live slider changes and supports arrow keys', async () => {
    vi.mocked(windowBridge.getPinnedAppearance).mockResolvedValue({ alwaysOnTop: true, opacity: 0.5 });
    render(<AlwaysOnTopControl />);
    await flush();
    const slider = await openSlider();

    fireEvent.keyDown(slider, { key: 'ArrowRight' });

    expect(slider.getAttribute('aria-valuenow')).toBe('51');
    expect(windowBridge.setPinnedAppearance).toHaveBeenCalledWith(true, 0.51);
  });

  it('keeps the real Blueprint popover open while a drag leaves it', async () => {
    vi.mocked(windowBridge.getPinnedAppearance).mockResolvedValue({ alwaysOnTop: true, opacity: 0.5 });
    render(<AlwaysOnTopControl />);
    await flush();
    const slider = await openSlider();

    fireEvent.mouseDown(slider, { clientX: 0 });
    fireEvent.mouseMove(document, { clientX: 1 });
    expect(windowBridge.setPinnedAppearance).toHaveBeenCalledWith(true, 1);
    fireEvent.mouseLeave(slider);
    await act(() => vi.advanceTimersByTimeAsync(400));
    expect(screen.getByRole('slider', { name: 'Window opacity' })).toBeTruthy();
  });

  it('closes normally after a press outside the slider', async () => {
    vi.mocked(windowBridge.getPinnedAppearance).mockResolvedValue({ alwaysOnTop: true, opacity: 0.5 });
    render(<AlwaysOnTopControl />);
    await flush();
    await openSlider();

    const title = screen.getByText('Window opacity');
    fireEvent.mouseDown(title);
    act(() => capturedPopoverProps.current?.onInteraction?.(false));
    await act(() => vi.advanceTimersByTimeAsync(401));

    expect(screen.queryByRole('slider', { name: 'Window opacity' })).toBeNull();
  });

  it('locks the popover below the pin with flip off and an eight pixel offset', async () => {
    vi.mocked(windowBridge.getPinnedAppearance).mockResolvedValue({ alwaysOnTop: true, opacity: 1 });
    render(<AlwaysOnTopControl />);
    await flush();
    await openSlider();

    expect(capturedPopoverProps.current?.placement).toBe('bottom');
    expect(capturedPopoverProps.current?.modifiers).toEqual({
      flip: { enabled: false },
      offset: { enabled: true, options: { offset: [0, 8] } }
    });
  });
});
