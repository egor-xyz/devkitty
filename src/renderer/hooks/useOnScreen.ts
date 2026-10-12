import { useEffect, useRef, useState } from 'react';

/** Keep recurring work attached only to rows near the scroll view. */
export const useOnScreen = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setOnScreen(true);
      return;
    }

    let intersects = false;
    const sync = () => setOnScreen(intersects && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      intersects = entry.isIntersecting;
      sync();
    }, { rootMargin: '200px 0px' });
    observer.observe(element);
    document.addEventListener('visibilitychange', sync);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  return { onScreen, ref };
};
