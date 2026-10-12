// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { useOnScreen } from './useOnScreen';

const Probe = () => {
  const { onScreen, ref } = useOnScreen<HTMLDivElement>();
  return <div data-testid="row"
    ref={ref}
         >{onScreen ? 'on' : 'off'}</div>;
};

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

it('stops work when a row leaves the view or the page is hidden', () => {
  let report: ((entry: { isIntersecting: boolean }) => void) | undefined;
  const disconnect = vi.fn();
  vi.stubGlobal('IntersectionObserver', class {
    disconnect = disconnect;
    observe = vi.fn();
    constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
      report = (entry) => callback([entry]);
    }
  });
  const { unmount } = render(<Probe />);
  expect(screen.getByTestId('row').textContent).toBe('off');

  act(() => report?.({ isIntersecting: true }));
  expect(screen.getByTestId('row').textContent).toBe('on');
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(screen.getByTestId('row').textContent).toBe('off');

  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(screen.getByTestId('row').textContent).toBe('on');
  act(() => report?.({ isIntersecting: false }));
  expect(screen.getByTestId('row').textContent).toBe('off');
  unmount();
  expect(disconnect).toHaveBeenCalledOnce();
});
