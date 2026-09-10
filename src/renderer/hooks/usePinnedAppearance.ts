import {
  WINDOW_OPACITY_DEFAULT,
  type WindowAppearance,
  type WindowOpacity
} from 'types/window';
import { create } from 'zustand';

type PinnedAppearanceState = WindowAppearance & {
  initialize: () => Promise<void>;
  initialized: boolean;
  setOpacity: (opacity: WindowOpacity) => void;
  togglePin: () => void;
};

const initialAppearance: WindowAppearance = {
  alwaysOnTop: false,
  opacity: WINDOW_OPACITY_DEFAULT
};

let desiredAppearance = initialAppearance;
let pendingAppearance: undefined | WindowAppearance;
let requestInFlight = false;
let initializePromise: Promise<void> | undefined;
let interactionVersion = 0;

const sameAppearance = (left: WindowAppearance, right: WindowAppearance) =>
  left.alwaysOnTop === right.alwaysOnTop && left.opacity === right.opacity;

const showAppearance = (appearance: WindowAppearance) => {
  desiredAppearance = appearance;
  usePinnedAppearance.setState(appearance);
};

const drainAppearanceQueue = async () => {
  if (requestInFlight || !pendingAppearance) return;

  const sent = pendingAppearance;
  pendingAppearance = undefined;
  requestInFlight = true;

  try {
    const actual = await window.bridge.window.setPinnedAppearance(sent.alwaysOnTop, sent.opacity);
    if (!pendingAppearance && sameAppearance(desiredAppearance, sent)) showAppearance(actual);
  } catch {
    try {
      const actual = await window.bridge.window.getPinnedAppearance();
      if (!pendingAppearance && sameAppearance(desiredAppearance, sent)) showAppearance(actual);
    } catch {
      // Keep the latest local choice when the window state cannot be read.
    }
  } finally {
    requestInFlight = false;
    if (pendingAppearance) void drainAppearanceQueue();
  }
};

const requestAppearance = (appearance: WindowAppearance) => {
  interactionVersion += 1;
  showAppearance(appearance);
  pendingAppearance = appearance;
  void drainAppearanceQueue();
};

export const usePinnedAppearance = create<PinnedAppearanceState>()((set, get) => ({
  ...initialAppearance,
  initialize: () => {
    if (get().initialized) return Promise.resolve();
    if (initializePromise) return initializePromise;

    const { alwaysOnTop, opacity } = get();
    desiredAppearance = { alwaysOnTop, opacity };
    const mountVersion = interactionVersion;
    initializePromise = window.bridge.window.getPinnedAppearance()
      .then((appearance: WindowAppearance) => {
        if (interactionVersion === mountVersion) showAppearance(appearance);
      })
      .catch(() => {
        // Use safe defaults if the native window state cannot be read.
      })
      .finally(() => {
        set({ initialized: true });
        initializePromise = undefined;
      });

    return initializePromise;
  },
  initialized: false,
  setOpacity: (opacity) => requestAppearance({
    alwaysOnTop: desiredAppearance.alwaysOnTop,
    opacity
  }),
  togglePin: () => requestAppearance({
    alwaysOnTop: !desiredAppearance.alwaysOnTop,
    opacity: desiredAppearance.opacity
  })
}));
