// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { useOnScreen } from './useOnScreen';

let report: (() => void) | undefined;
let options: IntersectionObserverInit | undefined;
const disconnect = vi.fn();

const stubObserver = () => vi.stubGlobal('IntersectionObserver', class {
  disconnect = disconnect;
  observe = vi.fn();
  constructor(callback: () => void, init: IntersectionObserverInit) {
    report = callback;
    options = init;
  }
});

// The scroll view is 0..800px; with the 200px margin rows count from -200 to 1000.
const place = (element: HTMLElement, top: number, bottom = top) => {
  element.getBoundingClientRect = () => ({ bottom, top } as DOMRect);
};

const Probe = () => {
  const { onScreen, ref } = useOnScreen<HTMLDivElement>();
  return <div data-testid="row"
    ref={ref}
         >{onScreen ? 'on' : 'off'}</div>;
};

const Card = () => {
  const { endRef, onScreen, ref } = useOnScreen<HTMLDivElement>();
  return (
    <div data-testid="view"
      style={{ overflowY: 'auto' }}
    >
      <div data-testid="start"
        ref={ref}
      />

      <div data-testid="state">{onScreen ? 'on' : 'off'}</div>

      <div data-testid="end"
        ref={endRef}
      />
    </div>
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
  disconnect.mockReset();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

it('stops work when a row leaves the view or the page is hidden', () => {
  stubObserver();
  vi.stubGlobal('innerHeight', 800);
  const { unmount } = render(<Probe />);
  const row = screen.getByTestId('row');
  expect(row.textContent).toBe('off');

  place(row, 0, 45);
  act(() => report?.());
  expect(row.textContent).toBe('on');
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(row.textContent).toBe('off');

  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(row.textContent).toBe('on');
  place(row, 1100, 1145);
  act(() => report?.());
  expect(row.textContent).toBe('off');
  unmount();
  expect(disconnect).toHaveBeenCalledOnce();
});

it('treats a row as on screen until it fully leaves the view, even when taller than the view', () => {
  stubObserver();
  render(<Card />);
  const view = screen.getByTestId('view');
  const start = screen.getByTestId('start');
  const end = screen.getByTestId('end');
  place(view, 0, 800);
  const state = () => screen.getByTestId('state').textContent;
  const scrollTo = (startTop: number, endBottom: number) => {
    place(start, startTop);
    place(end, endBottom);
    act(() => report?.());
  };

  expect(options?.root).toBe(view);
  scrollTo(1100, 2500);
  expect(state()).toBe('off');
  scrollTo(700, 2100);
  expect(state()).toBe('on');
  // The top scrolled out above, the bottom is still below: the row fills the view.
  scrollTo(-400, 1000);
  expect(state()).toBe('on');
  scrollTo(-1300, 100);
  expect(state()).toBe('on');
  scrollTo(-1700, -300);
  expect(state()).toBe('off');
});
