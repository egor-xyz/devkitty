import { Classes } from '@blueprintjs/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { appToaster } from 'renderer/utils/appToaster';
import { cn } from 'renderer/utils/cn';
import { type Pull } from 'types/gitHub';
import { type Project } from 'types/project';

import { PullRequest } from '../../components/PullRequest';

type PullWithTags = {
  pull: Pull;
  tags: string[];
};

export const usePulls = (project: Project) => {
  const [pulls, setPulls] = useState<PullWithTags[]>([]);
  const [showPulls, setShowPulls] = useState(() => {
    const saved = localStorage.getItem(`showPulls:${project.id}`);
    return saved ? JSON.parse(saved) : false;
  });
  const [isEmpty, setIsEmpty] = useState(true);
  const { gitHubPulls, gitHubToken } = useAppSettings();
  const [loading, setLoading] = useState(true);
  const intervalId = useRef<null | number>(null);

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
    setShowPulls((prev) => {
      const newValue = !prev;
      localStorage.setItem(`showPulls:${project.id}`, JSON.stringify(newValue));
      return newValue;
    });
  }, [gitHubToken, project.id, showPulls]);

  const refreshPulls = useCallback(() => {
    getPulls();
  }, [getPulls]);

  useEffect(() => {
    if (!showPulls || !project.id) return;

    getPulls();

    if (!intervalId.current) {
      intervalId.current = window.setInterval(() => {
        getPulls();
      }, gitHubPulls.pollInterval);
    }

    return () => {
      if (intervalId.current) {
        window.clearInterval(intervalId.current);
        intervalId.current = null;
      }
    };
  }, [showPulls, project.id, getPulls, gitHubPulls.pollInterval]);

  const Pulls = useMemo(
    () =>
      showPulls && (
        <div className="relative">
          {isEmpty && pulls.length < 1 && (
            <div className={cn('flex justify-between items-center py-2.5 px-4', Classes.TEXT_MUTED, loading && Classes.SKELETON)}>
              <span>No pull request were found</span>
            </div>
          )}

          {pulls.map(({ pull, tags }) => (
            <PullRequest
              key={pull.id}
              pull={pull}
              tags={tags}
            />
          ))}
        </div>
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
