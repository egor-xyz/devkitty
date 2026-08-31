import { refresh as refreshPoller } from 'renderer/services/poller';

// Broadcast a "refresh now" so every repo card re-fetches its data (runs,
// pulls, git status) in place — a gentle update instead of a full app reload.
export const refreshEvent = 'devkitty:refresh';

// Bridges both worlds during the poller migration: components already moved
// onto the shared coordinator refresh via `refreshPoller`, while any not yet
// migrated still answer the legacy DOM event. A migrated component drops its
// `refreshEvent` listener so it doesn't double-fetch.
export const requestRefresh = () => {
  window.dispatchEvent(new Event(refreshEvent));
  refreshPoller();
};
