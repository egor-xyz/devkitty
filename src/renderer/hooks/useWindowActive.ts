import { useSyncExternalStore } from 'react';

// True when the window is focused and visible. Focus is tracked as explicit state
// (not read from hasFocus() inside events) to avoid event-ordering races.
let focused = typeof document !== 'undefined' && document.hasFocus();
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());
const onFocus = () => {
  focused = true;
  notify();
};
const onBlur = () => {
  focused = false;
  notify();
};

const subscribe = (listener: () => void) => {
  if (listeners.size === 0) {
    focused = document.hasFocus();
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', notify);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', notify);
    }
  };
};

const getSnapshot = () => focused && !document.hidden;

export const useWindowActive = (): boolean => useSyncExternalStore(subscribe, getSnapshot);
