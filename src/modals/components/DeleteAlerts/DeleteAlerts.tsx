import { FC, useMemo } from 'react';
import { Alert } from '@blueprintjs/core';

import { useModalsStore } from 'modals';
import { deleteBranch, deleteFolder } from 'utils';
import { useAppStore, useAppStoreDispatch } from 'context';

export const DeleteAlerts: FC = () => {
  const state = useAppStore();
  const dispatch = useAppStoreDispatch();
  const { data, name, closeModal } = useModalsStore();
  return useMemo(() => (<>
    <Alert
      cancelButtonText='Cancel'
      canEscapeKeyCancel={true}
      canOutsideClickCancel={true}
      confirmButtonText='Delete'
      icon='trash'
      intent='danger'
      isOpen={name === 'deleteBranch'}
      onCancel={closeModal}
      onConfirm={() => {
        if (name !== 'deleteBranch') return;
        deleteBranch(data?.name, data?.project, state, dispatch);
        closeModal();
      }}
    >
      <div>Are you sure?</div>
      You want to delete branch <b>{data?.name}?</b>
    </Alert>

    <Alert
      cancelButtonText='Cancel'
      canEscapeKeyCancel={true}
      canOutsideClickCancel={true}
      confirmButtonText='Delete'
      icon='trash'
      intent='danger'
      isOpen={name === 'deleteProject'}
      onCancel={closeModal}
      onConfirm={() => {
        deleteFolder(data, state, dispatch);
        closeModal();
      }}
    >
      <div>Are you sure?</div>
      You want to delete folder <b>{data}?</b>
    </Alert>
  </>), // eslint-disable-next-line
  [data, name]);
};