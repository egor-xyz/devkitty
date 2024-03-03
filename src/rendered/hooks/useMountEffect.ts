import { useEffect } from 'react';

/**
 * Hook working on component mount
 */
export const useMountEffect = (effectCallback: () => (() => void) | void) => {
  useEffect(effectCallback, []);
};
