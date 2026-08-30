// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDarkModeStore } from './useDarkMode';
import { useModal } from './useModal';

describe('useModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useModal.setState({ activeModal: undefined });
  });

  describe('openModal', () => {
    it('should set the active modal in the store for remove:project', () => {
      const modal = { name: 'remove:project' as const, props: { id: 'project-1', name: 'My Project' } };

      useModal.getState().openModal(modal);

      expect(useModal.getState().activeModal).toEqual(modal);
    });

    it('should set the active modal in the store for group', () => {
      const modal = { name: 'group' as const, props: {} };

      useModal.getState().openModal(modal);

      expect(useModal.getState().activeModal).toEqual(modal);
    });

    it('should set the active modal in the store for sticker:add', () => {
      const modal = { name: 'sticker:add' as const, props: {} };

      useModal.getState().openModal(modal);

      expect(useModal.getState().activeModal).toEqual(modal);
    });
  });

  describe('Modal', () => {
    it('should return null when there is no active modal', () => {
      expect(useModal.getState().Modal()).toBeNull();
    });

    it('should return an element with the current dark mode and default isOpen of true', () => {
      useDarkModeStore.setState({ darkMode: true });
      useModal.getState().openModal({ name: 'remove:project', props: { id: 'project-1', name: 'My Project' } });

      const element = useModal.getState().Modal();

      expect(element).not.toBeNull();
      expect(element?.props.darkMode).toBe(true);
      expect(element?.props.isOpen).toBe(true);
    });

    it('should return null when the active modal name does not match any known modal', () => {
      useModal.setState({
        activeModal: { name: 'not:a:real:modal', props: {} } as unknown as ReturnType<
          typeof useModal.getState
        >['activeModal']
      });

      expect(useModal.getState().Modal()).toBeNull();
    });

    describe('onClose', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should immediately set isOpen to false when called', () => {
        useModal.getState().openModal({ name: 'remove:project', props: { id: 'project-1', name: 'My Project' } });

        const element = useModal.getState().Modal();
        element?.props.onClose();

        expect(useModal.getState().activeModal).toMatchObject({ isOpen: false, name: 'remove:project' });
      });

      it('should clear the active modal after the animation delay elapses', () => {
        useModal.getState().openModal({ name: 'remove:project', props: { id: 'project-1', name: 'My Project' } });

        const element = useModal.getState().Modal();
        element?.props.onClose();

        vi.advanceTimersByTime(100);

        expect(useModal.getState().activeModal).toBeUndefined();
      });
    });
  });
});
