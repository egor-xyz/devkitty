import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { refreshEvent, requestRefresh } from './refresh';

// The suite runs in node (no jsdom). A bare EventTarget is enough to stand in
// for `window` here — requestRefresh only dispatches and listens.
describe('requestRefresh', () => {
  beforeEach(() => {
    vi.stubGlobal('window', new EventTarget());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('dispatches the shared refresh event so every card re-fetches in place', () => {
    const listener = vi.fn();
    window.addEventListener(refreshEvent, listener);

    requestRefresh();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].type).toBe(refreshEvent);
  });

  it('uses a stable, namespaced event name', () => {
    expect(refreshEvent).toBe('devkitty:refresh');
  });
});
