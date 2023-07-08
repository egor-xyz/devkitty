import { Bridge } from '../main/ipcs/preload';

export declare global {
  interface Window {
    bridge: Bridge;
  }
}
