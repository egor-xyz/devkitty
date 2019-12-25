import { FC, memo } from 'react';
import { Button, Dialog } from '@blueprintjs/core';

import { addFolders, scanFolders } from 'utils';
import { useAppStore, useAppStoreDispatch } from 'context';
import { JenkinsLogo } from 'assets/icons/svg';
import { useModalsStore } from 'modals/context';
import { useJenkinsStore } from 'modules/Jenkins/context';

import css from './WelcomeModal.module.scss';

interface Props {
  open: boolean;
}

export const WelcomeModal:FC<Props> = memo(({ open }) => {
  const state = useAppStore();
  const dispatch = useAppStoreDispatch();
  const { isActive } = useJenkinsStore();

  const { openModal } = useModalsStore();

  const addProjects = async () => {
    await addFolders(state, dispatch);
    scanFolders({ dispatch, state });
  };

  return (
    <Dialog
      className={css.root}
      isCloseButtonShown={false}
      isOpen={open}
      title='Welcome to devkitty!'
      usePortal={false}
    >
      <Button
        className={css.btn}
        icon={'folder-shared-open'}
        text={'Add projects'}
        onClick={addProjects}
      />

      {isActive && (
        <Button
          className={css.btn}
          onClick={() => openModal({ name: 'jenkinsJob' })}
        >
          <JenkinsLogo
            className={css.jenkinsLogo}
            height={20}
          />
          <div>Add Jenkins Job</div>
        </Button>
      )}
    </Dialog>
  );
});