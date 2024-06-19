import { useEffect } from 'react';

/**
 * Hook working on component mount
 */
export const useMountEffect = (effectCallback: () => (() => void) | void) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effectCallback, []);
};
