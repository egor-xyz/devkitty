import { describe, expect, it, vi } from 'vitest';

// Mock the SVG imports to avoid Vite SVG handling
vi.mock('./gitHub/action-queued.svg?react', () => ({
  default: 'ActionQueuedIcon'
}));
vi.mock('./gitHub/action-skipped.svg?react', () => ({
  default: 'ActionSkippedIcon'
}));
vi.mock('./gitHubIcons', () => ({
  ActionDoneIcon: 'ActionDoneIcon',
  ActionFailedIcon: 'ActionFailedIcon',
  ActionInProgressIcon: 'ActionInProgressIcon',
  ActionPendingIcon: 'ActionPendingIcon',
  ActionsCanceledIcon: 'ActionsCanceledIcon',
  ActionsIcon: 'ActionsIcon'
}));

import { getStatusIcon } from './gitHubStatusUtils';

describe('gitHubStatusUtils', () => {
  describe('getStatusIcon', () => {
    it('should return ActionDoneIcon for completed status', () => {
      expect(getStatusIcon('completed')).toBe('ActionDoneIcon');
    });

    it('should return ActionDoneIcon for success status', () => {
      expect(getStatusIcon('success' as any)).toBe('ActionDoneIcon');
    });

    it('should return ActionFailedIcon for failed status', () => {
      expect(getStatusIcon('failed' as any)).toBe('ActionFailedIcon');
    });

    it('should return ActionFailedIcon for failure status', () => {
      expect(getStatusIcon('failure' as any)).toBe('ActionFailedIcon');
    });

    it('should return ActionInProgressIcon for in_progress status', () => {
      expect(getStatusIcon('in_progress')).toBe('ActionInProgressIcon');
    });

    it('should return ActionPendingIcon for pending status', () => {
      expect(getStatusIcon('pending' as any)).toBe('ActionPendingIcon');
    });

    it('should return ActionsCanceledIcon for cancelled status', () => {
      expect(getStatusIcon('cancelled' as any)).toBe('ActionsCanceledIcon');
    });

    it('should return ActionQueuedIcon for queued status', () => {
      expect(getStatusIcon('queued')).toBe('ActionQueuedIcon');
    });

    it('should return ActionSkippedIcon for skipped status', () => {
      expect(getStatusIcon('skipped' as any)).toBe('ActionSkippedIcon');
    });

    it('should return ActionsIcon for unknown status', () => {
      expect(getStatusIcon('unknown' as any)).toBe('ActionsIcon');
    });
  });
});
