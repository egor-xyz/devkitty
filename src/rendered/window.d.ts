/* eslint-disable @typescript-eslint/consistent-type-definitions */
import { type Bridge } from '../main/ipcs/preload';

export declare global {
  interface Window {
    __REACT_DEVTOOLS_GLOBAL_HOOK__: {
      isDisabled: boolean;
    };
    bridge: Bridge;
  }
}
