import { Classes } from '@blueprintjs/core';
import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAppSettings } from 'rendered/hooks/useAppSettings';
import { appToaster } from 'rendered/utils/appToaster';
import { Pull, PullType, pullTypes } from 'types/gitHub';
import { Project } from 'types/project';

import { PullRequest } from '../../components/PullRequest';
import { Action, Actions, Empty, Title, WrapBlock } from './usePulls.styles';

const aliases: { [key in PullType]: string } = {
  assigned: 'Assigned',
  author: 'Created',
  mentions: 'Mentioned',
  'review-requested': 'Review requested'
};

export const usePulls = (project: Project) => {
  const [pulls, setPulls] = useState<Pull[]>([]);
  const [showPulls, setShowPulls] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const { gitHubToken } = useAppSettings();
  const [pullType, setPullType] = useState<(typeof pullTypes)[number]>(pullTypes[0]);
  const [loading, setLoading] = useState(true);

  const getPulls = useCallback(
    async (type: PullType) => {
      setIsEmpty(true);
      setPulls([]);
      setLoading(true);

      const res = await window.bridge.gitAPI.getPulls(project.id, type);
      if (!res.success || !res.pulls.length) {
        setLoading(false);
        return;
      }

      setPulls(res.pulls ?? []);
      setLoading(false);
      setIsEmpty(false);
    },
    [project.id]
  );

  const togglePulls = useCallback(async () => {
    if (!showPulls && !gitHubToken) {
      (await appToaster).show({
        intent: 'warning',
        message: 'Set GitHub token in settings to see Pull Requests'
      });
      return;
    }
    setShowPulls(!showPulls);
  }, [showPulls, gitHubToken]);

  const refreshPulls = useCallback(() => {
    getPulls(pullType);
  }, [pullType, getPulls]);

  useEffect(() => {
    if (!showPulls || !project.id) return;

    getPulls(pullType);
  }, [showPulls, pullType, project.id, getPulls]);

  const Pulls = useMemo(
    () =>
      showPulls && (
        <WrapBlock>
          {isEmpty && pulls.length < 1 && (
            <Empty className={clsx(Classes.TEXT_MUTED, loading && Classes.SKELETON)}>
              <span>No pull request were found</span>
            </Empty>
          )}

          {pulls.map((pull: any) => (
            <PullRequest
              key={pull.id}
              pull={pull}
            />
          ))}

          <Title>
            <span>Pull requests ({pullType})</span>
          </Title>

          <Actions>
            {pullTypes.map((type) => (
              <Action
                $active={type === pullType}
                key={type}
                onClick={() => setPullType(type)}
              >
                {aliases[type]}
              </Action>
            ))}
          </Actions>
        </WrapBlock>
      ),
    [showPulls, isEmpty, pulls, loading, pullType]
  );

  return {
    getPulls,
    Pulls,
    refreshPulls,
    showPulls,
    togglePulls
  };
};
