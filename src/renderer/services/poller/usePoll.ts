import { useEffect, useRef, useState } from 'react';

import type { PollSpec } from './coordinator';

import { subscribe } from './coordinator';

export type UsePollResult<T> = {
  data: T | undefined;
  error: unknown;
  loading: boolean;
};

/**
 * Thin React binding over the poller coordinator (./coordinator.ts).
 *
 * Subscribes once per `spec.key`. `spec.fetch` and `spec.interval` are kept
 * fresh via refs on every render, so re-renders with new closures never
 * force a resubscribe — only a change in `spec.key` does.
 */
export function usePoll<T>(spec: PollSpec<T>): UsePollResult<T> {
  const specRef = useRef(spec);
  specRef.current = spec;

  const [state, setState] = useState<UsePollResult<T>>({
    data: undefined,
    error: undefined,
    loading: true
  });

  useEffect(() => {
    setState({ data: undefined, error: undefined, loading: true });

    const liveSpec: PollSpec<T> = {
      fetch: () => specRef.current.fetch(),
      interval: (data) => specRef.current.interval(data),
      key: specRef.current.key,
      priority: specRef.current.priority
    };

    const unsubscribe = subscribe<T>(
      liveSpec,
      (data) => {
        setState({ data, error: undefined, loading: false });
      },
      (error) => {
        setState((prev) => ({ data: prev.data, error, loading: false }));
      }
    );

    return unsubscribe;
    // Only `spec.key` should trigger a resubscribe; fetch/interval stay live via specRef.
     
  }, [spec.key]);

  return state;
}
