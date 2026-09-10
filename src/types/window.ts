export const WINDOW_OPACITY_MIN = 0.4;
export const WINDOW_OPACITY_MAX = 1;
export const WINDOW_OPACITY_STEP = 0.01;
export const WINDOW_OPACITY_DEFAULT = 1;

export type WindowAppearance = {
  alwaysOnTop: boolean;
  /** Saved glass level. The native window itself always stays fully opaque. */
  opacity: WindowOpacity;
};

export type WindowOpacity = number;
