import { Toaster } from '@blueprintjs/core';

export const msg = Toaster.create({
  autoFocus: true,
  canEscapeKeyClear: true,
  maxToasts: 3,
  position: 'top-right'
}, document.body);