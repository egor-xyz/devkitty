import { Classes, Dialog } from '@blueprintjs/core';
import { FC } from 'react';

import { ModalProps } from 'types';

export type GroupModalProps = {
  groupId?: string;
  projectId: string;
};

export const GroupModal: FC<ModalProps & GroupModalProps> = ({ isOpen, onClose, darkMode }) => {
  return (
    <Dialog
      className={darkMode && Classes.DARK}
      icon="group-item"
      isOpen={isOpen}
      title={'Group'}
      onClose={onClose}
    >
      Group Modal
    </Dialog>
  );
};
