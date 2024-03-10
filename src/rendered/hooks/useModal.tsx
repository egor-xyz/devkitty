import type { FC, JSX } from 'react';
import { create } from 'zustand';

import { GitResetModal, type GitResetModalProps } from 'rendered/components/Modals/GitResetModal';
import { ModalProps } from 'types';
import { GitMergeModal, GitMergeModalProps } from 'rendered/components/Modals/GitMergeModal';
import { RemoveAlert } from 'rendered/components/Project/components/RemoveAlert';
import { RemoveAlertProps } from 'rendered/components/Project/components/RemoveAlert/RemoveAlert';
import { GroupModal, GroupModalProps } from 'rendered/components/Modals/GroupModal/GroupModal';

import { useDarkModeStore } from './useDarkMode';

type ActiveModal = ModalProps &
  (
    | {
        name: 'git:reset';
        props: GitResetModalProps;
      }
    | {
        name: 'git:merge';
        props: GitMergeModalProps;
      }
    | {
        name: 'remove:project';
        props: RemoveAlertProps;
      }
    | {
        name: 'group';
        props: GroupModalProps;
      }
  );

type State = {
  Modal: () => JSX.Element | null;
  activeModal?: ActiveModal;
  openModal: (modal: ActiveModal) => void;
};

const Modals: Record<ActiveModal['name'], FC<ActiveModal['props']>> = {
  'git:merge': GitMergeModal,
  'git:reset': GitResetModal,
  group: GroupModal,
  'remove:project': RemoveAlert
};

export const useModal = create<State>()((set, get) => ({
  activeModal: undefined,
  Modal: () => {
    const { name, props, isOpen = true } = get().activeModal ?? {};
    const { darkMode } = useDarkModeStore.getState();

    const onClose = () => {
      set({ activeModal: { isOpen: false, name, props } as ActiveModal });
      // Delay to show the animation
      setTimeout(() => set({ activeModal: undefined }), 100);
    };

    const modalProps: ModalProps = { darkMode, isOpen, onClose };
    const Modal = Modals[name];

    return Modal ? (
      <Modal
        {...props}
        {...modalProps}
      />
    ) : null;
  },
  openModal: (activeModal) => set({ activeModal })
}));
