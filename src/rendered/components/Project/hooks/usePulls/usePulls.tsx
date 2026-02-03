import { Classes } from '@blueprintjs/core';
import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppSettings } from 'rendered/hooks/useAppSettings';
import { appToaster } from 'rendered/utils/appToaster';
import { type Pull } from 'types/gitHub';
import { type Project } from 'types/project';

import { PullRequest } from '../../components/PullRequest';
import { Empty, WrapBlock } from './usePulls.styles';

type PullWithTags = {
  pull: Pull;
  tags: string[];
};

export const usePulls = (project: Project) => {
  const [pulls, setPulls] = useState<PullWithTags[]>([]);
  const [showPulls, setShowPulls] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const { gitHubToken } = useAppSettings();
  const [loading, setLoading] = useState(true);

  const getPulls = useCallback(async () => {
    setIsEmpty(true);
    setPulls([]);
    setLoading(true);

    const [authorRes, reviewRes] = await Promise.all([
      window.bridge.gitAPI.getPulls(project.id, 'author'),
      window.bridge.gitAPI.getPulls(project.id, 'review-requested')
    ]);

    const map = new Map<number, PullWithTags>();

    const addPulls = (items: Pull[] | undefined, tag: string) => {
      if (!items) return;
      items.forEach((pull) => {
        const existing = map.get(pull.id);
        if (existing) {
          if (!existing.tags.includes(tag)) existing.tags.push(tag);
        } else {
          map.set(pull.id, { pull, tags: [tag] });
        }
      });
    };

    if (authorRes.success) addPulls(authorRes.pulls, 'My');
    if (reviewRes.success) addPulls(reviewRes.pulls, 'Review requested');

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.pull.created_at).getTime() - new Date(a.pull.created_at).getTime()
    );

    setPulls(merged);
    setLoading(false);
    setIsEmpty(merged.length === 0);
  }, [project.id]);

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
    getPulls();
  }, [getPulls]);

  useEffect(() => {
    if (!showPulls || !project.id) return;

    getPulls();
  }, [showPulls, project.id, getPulls]);

  const Pulls = useMemo(
    () =>
      showPulls && (
        <WrapBlock>
          {isEmpty && pulls.length < 1 && (
            <Empty className={clsx(Classes.TEXT_MUTED, loading && Classes.SKELETON)}>
              <span>No pull request were found</span>
            </Empty>
          )}

          {pulls.map(({ pull, tags }) => (
            <PullRequest
              key={pull.id}
              pull={pull}
              tags={tags}
            />
          ))}
        </WrapBlock>
      ),
    [showPulls, isEmpty, pulls, loading]
  );

  return {
    getPulls,
    Pulls,
    refreshPulls,
    showPulls,
    togglePulls
  };
};
