import { useCallback, useEffect, useMemo, useState } from 'react';
import { Classes, Tag } from '@blueprintjs/core';

import { Project } from 'types/project';
import { appToaster } from 'rendered/utils/appToaster';
import { useAppSettings } from 'rendered/hooks/useAppSettings';
import { Pull } from 'types/gitHub';

import { PullRequest } from '../../components/PullRequest';
import { Empty } from './usePulls.styles';

export const usePulls = (project: Project) => {
  const [pulls, setPulls] = useState<Pull[]>([]);
  const [showPulls, setShowPulls] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);
  const { gitHubToken } = useAppSettings();

  const getPulls = useCallback(async () => {
    console.log('getPulls', project.id);
    const res = await window.bridge.gitAPI.getPulls(project.id);

    if (!res.success) {
      setIsEmpty(true);
      return;
    }

    setIsEmpty(false);
    setPulls(res.pulls ?? []);
  }, [project.id]);

  const togglePulls = async () => {
    if (!showPulls && !gitHubToken) {
      (await appToaster).show({
        intent: 'warning',
        message: 'Set GitHub token in settings to see Pull Requests'
      });
      return;
    }
    setShowPulls(!showPulls);
  };

  useEffect(() => {
    if (!showPulls || !project.id) return;

    getPulls();
  }, [getPulls, project, showPulls]);

  const Pulls = useMemo(
    () =>
      showPulls && (
        <>
          {isEmpty && pulls.length < 1 && (
            <Empty className={Classes.TEXT_MUTED}>
              <span>No pull request were found</span>
              <Tag minimal>watcher is active</Tag>
            </Empty>
          )}

          {pulls.map((pull: any) => (
            <PullRequest
              key={pull.id}
              pull={pull}
            />
          ))}
        </>
      ),
    [pulls, showPulls, isEmpty]
  );

  return {
    getPulls,
    Pulls,
    showPulls,
    togglePulls
  };
};
