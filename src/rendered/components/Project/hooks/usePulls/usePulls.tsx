import { Classes } from '@blueprintjs/core';
import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppSettings } from 'rendered/hooks/useAppSettings';
import { appToaster } from 'rendered/utils/appToaster';
import { type Pull, type PullType, pullTypes } from 'types/gitHub';
import { type Project } from 'types/project';

import { PullRequest } from '../../components/PullRequest';

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
        <div className="border-t border-blueprint-light-gray2 dark:border-black mt-0.5 relative group">
          {isEmpty && pulls.length < 1 && (
            <div className={clsx("py-2.5 px-4 flex justify-between items-center", Classes.TEXT_MUTED, loading && Classes.SKELETON)}>
              <span>No pull request were found</span>
            </div>
          )}

          {pulls.map((pull) => (
            <PullRequest
              key={pull.id}
              pull={pull}
            />
          ))}

          <div className="opacity-0 absolute -top-2.5 left-4 bg-blueprint-light-gray2 dark:bg-black rounded-xl py-0.5 px-2 text-xs text-black dark:text-white group-hover:opacity-100 transition-opacity duration-200">
            <span>Pull requests ({aliases[pullType]})</span>
          </div>

          <div className="flex absolute -top-2.5 right-4 bg-blueprint-light-gray2 dark:bg-black rounded-xl py-0.5 px-2 text-xs gap-2.5 opacity-0 transition-opacity duration-200 text-black dark:text-white group-hover:opacity-100">
            {pullTypes.map((type) => (
              <div
                className={`cursor-pointer ${type === pullType ? 'font-bold' : ''}`}
                key={type}
                onClick={() => setPullType(type)}
              >
                {aliases[type]}
              </div>
            ))}
          </div>
        </div>
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
