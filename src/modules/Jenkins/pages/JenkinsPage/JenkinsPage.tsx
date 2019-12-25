import { Spinner } from '@blueprintjs/core';
import clsx from 'clsx';
import { isEmpty } from 'lodash';
import { FC, useMemo } from 'react';

import { useAppStore } from 'context';
import { useModalsStore, WelcomeModal } from 'modals';
import { defGroups } from 'models';
import { JenkinsJobCard, useJenkinsStore } from 'modules/Jenkins';

import css from './JenkinsPage.module.scss';

export const JenkinsPage: FC = () => {
  const state = useAppStore();

  const { jobs } = useJenkinsStore();
  const { name } = useModalsStore();

  const {
    bottomBar,
    groupFilter,
    groupId: selectedGroupId = '0',
    projects,
    projectsSettings,
    projectsSrc,
    collapsedGroups,
    groups,
    loading,
    projectsWithError
  } = state;

  let sortedJobs = [...jobs];

  if (selectedGroupId !== '0') {
    if (selectedGroupId !== defGroups[1].id) {
      sortedJobs = sortedJobs.filter(({ group }) => group?.id === selectedGroupId);
    }
  }

  return useMemo(() => {
    return (
      <div className={clsx(css.root, { [css.noFooter]: !bottomBar })} >
        {!isEmpty(loading) && (
          <div className={css.loader}>
            <Spinner intent={'primary'} />
          </div>
        )}

        {sortedJobs.map(job => (
          <JenkinsJobCard
            job={job}
            key={job.id}
          />
        ))}

        <WelcomeModal open={isEmpty(loading) && !jobs.length && !projectsSrc.length} />

        <div className={css.fire} />
      </div>
    );
  }, [ // eslint-disable-line
    bottomBar,
    collapsedGroups,
    groupFilter,
    groups,
    jobs,
    loading,
    name,
    projects,
    projectsSettings,
    projectsSrc,
    selectedGroupId,
    projectsWithError
  ]);
};
