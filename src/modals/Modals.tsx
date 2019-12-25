import { FC, useMemo } from 'react';
import { Dialog } from '@blueprintjs/core';

import { JenkinsJobModal, JenkinsServerModal } from 'modules';
import { JenkinsLogo } from 'assets/icons/svg';

import {
  About,
  ConsoleModal,
  DeleteAlerts,
  MergeModal,
  PullRequestModal,
  StashModal,
  useModalsStore
} from '.';
import css from './Modals.module.scss';

export const Modals: FC = () => {
  const modalsStore = useModalsStore();
  const { name, closeModal, data } = modalsStore;
  return useMemo(() => (<>
    <About />
    <DeleteAlerts />

    <Dialog
      canEscapeKeyClose={false}
      canOutsideClickClose={true}
      icon={(
        <JenkinsLogo
          className={css.icon}
          height={20}
        />
      )}
      isOpen={name === 'jenkinsServer'}
      portalClassName={css.removePadding}
      title={!data ? 'Add Jenkins Server' : 'Edit Jenkins Server'}
      onClose={closeModal}
    >
      <JenkinsServerModal />
    </Dialog>

    <Dialog
      canEscapeKeyClose={false}
      canOutsideClickClose={true}
      icon={(
        <JenkinsLogo
          className={css.icon}
          height={20}
        />
      )}
      isOpen={name === 'jenkinsJob'}
      portalClassName={css.removePadding}
      title='Jenkins Job'
      onClose={closeModal}
    >
      <JenkinsJobModal />
    </Dialog>

    <Dialog
      canEscapeKeyClose={false}
      canOutsideClickClose={true}
      icon='projects'
      isOpen={name === 'stash'}
      title='Git Stash'
      onClose={closeModal}
    >
      {name === 'stash' && (
        <StashModal />
      )}
    </Dialog>

    <Dialog
      canEscapeKeyClose={false}
      canOutsideClickClose={false}
      icon='git-merge'
      isOpen={name === 'merge'}
      title={`Git merge ${data?.project?.repo ?? ''} `}
      onClose={closeModal}
    >
      {name === 'merge' && (
        <MergeModal />
      )}
    </Dialog>

    <Dialog
      canEscapeKeyClose={false}
      canOutsideClickClose={false}
      icon='git-pull'
      isOpen={name === 'pullRequest'}
      title='Create Pull Request'
      onClose={closeModal}
    >
      {name === 'pullRequest' && (
        <PullRequestModal />
      )}
    </Dialog>

    <Dialog
      canEscapeKeyClose={false}
      canOutsideClickClose={false}
      icon='console'
      isOpen={name === 'console'}
      portalClassName={css.removePadding}
      title='Console output'
      onClose={closeModal}
    >
      {name === 'console' && <ConsoleModal />}
    </Dialog>
  </>), [name, data]); // eslint-disable-line
};