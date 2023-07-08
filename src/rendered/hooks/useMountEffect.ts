import { useEffect } from 'react';

/**
 * Hook working on component mount
 */
export const useMountEffect = (effectCallback: () => (() => void) | void) => {
  // There should be no dependencies here
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effectCallback, []);
};
