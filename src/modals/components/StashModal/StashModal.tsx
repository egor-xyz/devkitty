import { FC } from 'react';
import { Tab, Tabs } from '@blueprintjs/core';

import { Stash, UnStash } from 'components';
import { Project } from 'models';
import css from 'modals/components/StashModal/StashModal.module.scss';
import { useModalsStore } from 'modals/context';

export const StashModal:FC = () => {
  const modalsStore = useModalsStore();
  const { data } = modalsStore;
  const project: Project = data?.project;
  if (!project) return null;
  const defaultSelectedTabId = project?.status?.modified.length > 0
    ? 'stash'
    : 'unStash'
  ;

  return (
    <div className={css.root} >
      <Tabs
        defaultSelectedTabId={defaultSelectedTabId}
        renderActiveTabPanelOnly={true}
      >
        <Tab
          id='stash'
          panel={<Stash />}
          title='Stash'
        />
        <Tab
          id='unStash'
          panel={<UnStash />}
          title='UnStash'
        />
      </Tabs>
    </div>
  );
};