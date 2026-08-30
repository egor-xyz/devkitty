// Broadcast a "refresh now" so every repo card re-fetches its data (runs,
// pulls, git status) in place — a gentle update instead of a full app reload.
export const refreshEvent = 'devkitty:refresh';

export const requestRefresh = () => {
  window.dispatchEvent(new Event(refreshEvent));
};
