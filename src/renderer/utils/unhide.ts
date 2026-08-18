// Hidden actions and pull requests live in session storage, but repo cards keep
// their own copy in state. Settings fires this after clearing storage so those
// cards re-read it instead of waiting for a reload.
export const unhideEvent = 'devkitty:unhide';
