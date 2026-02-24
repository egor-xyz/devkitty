/* eslint-disable react/jsx-props-no-spreading */
import type { FC, JSX } from 'react';

import { GitMergeModal, type GitMergeModalProps } from 'renderer/components/Modals/GitMergeModal';
import { GitResetModal, type GitResetModalProps } from 'renderer/components/Modals/GitResetModal';
import { GroupModal, type GroupModalProps } from 'renderer/components/Modals/GroupModal/GroupModal';
import { TrayStickerModal } from 'renderer/components/Modals/TrayStickerModal';
import {
  WorktreeAddModal,
  type WorktreeAddModalProps
} from 'renderer/components/Modals/WorktreeAddModal/WorktreeAddModal';
import {
  HideRunAlert,
  type HideRunAlertProps
} from 'renderer/components/Project/components/HideRunAlert/HideRunAlert';
import {
  IgnoreWorkflowAlert,
  type IgnoreWorkflowAlertProps
} from 'renderer/components/Project/components/IgnoreWorkflowAlert/IgnoreWorkflowAlert';
import { RemoveAlert } from 'renderer/components/Project/components/RemoveAlert';
import { type RemoveAlertProps } from 'renderer/components/Project/components/RemoveAlert/RemoveAlert';
import {
  RemoveGroupAlert,
  type RemoveGroupAlertProps
} from 'renderer/components/Project/components/RemoveGroupAlert/RemoveGroupAlert';
import {
  RemoveWorktreeAlert,
  type RemoveWorktreeAlertProps
} from 'renderer/components/Project/components/RemoveWorktreeAlert/RemoveWorktreeAlert';
import { type ModalProps } from 'types/Modal';
import { create } from 'zustand';

import { useDarkModeStore } from './useDarkMode';

type ActiveModal = ModalProps &
  (
    | {
        name: 'action:hide';
        props: HideRunAlertProps;
      }
    | {
        name: 'git:merge';
        props: GitMergeModalProps;
      }
    | {
        name: 'git:reset';
        props: GitResetModalProps;
      }
    | {
        name: 'git:worktree:add';
        props: WorktreeAddModalProps;
      }
    | {
        name: 'git:worktree:remove';
        props: RemoveWorktreeAlertProps;
      }
    | {
        name: 'group';
        props: GroupModalProps;
      }
    | {
        name: 'ignore:workflow';
        props: IgnoreWorkflowAlertProps;
      }
    | {
        name: 'remove:group';
        props: RemoveGroupAlertProps;
      }
    | {
        name: 'remove:project';
        props: RemoveAlertProps;
      }
    | {
        name: 'sticker:add';
        props: ModalProps;
      }
  );

type State = {
  activeModal?: ActiveModal;
  Modal: () => JSX.Element | null;
  openModal: (modal: ActiveModal) => void;
};

const Modals: Record<ActiveModal['name'], FC<ActiveModal['props']>> = {
  'action:hide': HideRunAlert,
  'git:merge': GitMergeModal,
  'git:reset': GitResetModal,
  'git:worktree:add': WorktreeAddModal,
  'git:worktree:remove': RemoveWorktreeAlert,
  group: GroupModal,
  'ignore:workflow': IgnoreWorkflowAlert,
  'remove:group': RemoveGroupAlert,
  'remove:project': RemoveAlert,
  'sticker:add': TrayStickerModal
};

export const useModal = create<State>()((set, get) => ({
  activeModal: undefined,
  Modal: () => {
    const { isOpen = true, name, props } = get().activeModal ?? {};
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
