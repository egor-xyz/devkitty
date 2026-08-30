import { describe, expect, it } from 'vitest';

import { unhideEvent } from './unhide';

describe('unhideEvent', () => {
  it('should be a stable, namespaced event name used to signal repo cards to re-read hidden state', () => {
    expect(unhideEvent).toBe('devkitty:unhide');
  });
});
