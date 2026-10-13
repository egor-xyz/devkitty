import { useEffect, useRef, useState } from 'react';

const MARGIN_PX = 200;

const findScrollParent = (element: HTMLElement): HTMLElement | null => {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === 'auto' || overflowY === 'scroll') return parent;
  }
  return null;
};

/**
 * Keep recurring work attached only to rows near the scroll view.
 *
 * Put `ref` on a plain (non-sticky) element at the top of the row and
 * `endRef` on one at the bottom. A sticky header is a bad target: once
 * scrolled past it stays pinned (and observed as visible) under the next one.
 * Without `endRef`, `ref` alone is observed. Both must be mounted with the
 * row; they are read once.
 *
 * Observer callbacks only trigger a re-measure; the answer comes from live
 * positions. Known gap: a row taller than the view that jumps in or out in
 * one layout change (no scroll through the margin) keeps its old state.
 */
export const useOnScreen = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const start = ref.current;
    const end = endRef.current ?? start;
    if (!start || !end || typeof IntersectionObserver === 'undefined') {
      setOnScreen(true);
      return;
    }

    const root = findScrollParent(start);
    const sync = () => {
      const view = root?.getBoundingClientRect() ?? { bottom: window.innerHeight, top: 0 };
      const inView = start.getBoundingClientRect().top < view.bottom + MARGIN_PX
        && end.getBoundingClientRect().bottom > view.top - MARGIN_PX;
      setOnScreen(inView && !document.hidden);
    };
    const observer = new IntersectionObserver(sync, { root, rootMargin: `${MARGIN_PX}px 0px` });
    observer.observe(start);
    if (end !== start) observer.observe(end);
    document.addEventListener('visibilitychange', sync);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  return { endRef, onScreen, ref };
};
