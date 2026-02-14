import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock all the modal component imports
vi.mock('renderer/components/Modals/GitMergeModal', () => ({
  GitMergeModal: () => null
}));
vi.mock('renderer/components/Modals/GitResetModal', () => ({
  GitResetModal: () => null
}));
vi.mock('renderer/components/Modals/GroupModal/GroupModal', () => ({
  GroupModal: () => null
}));
vi.mock('renderer/components/Modals/TrayStickerModal', () => ({
  TrayStickerModal: () => null
}));
vi.mock('renderer/components/Modals/WorktreeAddModal/WorktreeAddModal', () => ({
  WorktreeAddModal: () => null
}));
vi.mock('renderer/components/Project/components/RemoveAlert', () => ({
  RemoveAlert: () => null
}));
vi.mock('renderer/components/Project/components/RemoveAlert/RemoveAlert', () => ({
  RemoveAlert: () => null
}));
vi.mock('renderer/components/Project/components/RemoveGroupAlert/RemoveGroupAlert', () => ({
  RemoveGroupAlert: () => null
}));
vi.mock('renderer/components/Project/components/RemoveWorktreeAlert/RemoveWorktreeAlert', () => ({
  RemoveWorktreeAlert: () => null
}));

import { useModal } from './useModal';

describe('useModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useModal.setState({ activeModal: undefined });
  });

  describe('initial state', () => {
    it('should have no active modal', () => {
      expect(useModal.getState().activeModal).toBeUndefined();
    });
  });

  describe('openModal', () => {
    it('should set the active modal', () => {
      const modal = {
        name: 'git:merge' as const,
        props: { branches: ['main', 'develop'], id: 'proj-1' }
      };

      useModal.getState().openModal(modal as any);

      expect(useModal.getState().activeModal).toEqual(modal);
    });

    it('should replace existing active modal', () => {
      const firstModal = {
        name: 'git:merge' as const,
        props: { branches: [], id: '1' }
      };
      const secondModal = {
        name: 'git:reset' as const,
        props: { branches: [], currentBranch: 'main', id: '2' }
      };

      useModal.getState().openModal(firstModal as any);
      useModal.getState().openModal(secondModal as any);

      expect(useModal.getState().activeModal?.name).toBe('git:reset');
    });
  });

  describe('Modal component', () => {
    it('should return null when no active modal is set', () => {
      useModal.setState({ activeModal: undefined });

      const ModalComponent = useModal.getState().Modal;
      const result = ModalComponent();

      expect(result).toBeNull();
    });
  });
});
