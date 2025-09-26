import { useEffect, useRef, useState } from 'react';
import { appToaster } from 'rendered/utils/appToaster';
import { type GitStatus } from 'types/project';

import { useAppSettings } from './useAppSettings';
import { useProjects } from './useProjects';

export const useGit = () => {
  const { fetchInterval } = useAppSettings();

  const [gitStatus, setGitStatus] = useState<GitStatus>();
  const [loading, setLoading] = useState(false);

  const intervalId = useRef<number | undefined>(undefined);
  const unmounted = useRef(false);

  const getStatus = async (id: string, polling = true) => {
    setLoading(true);

    const res = await window.bridge.git.getStatus(id);

    setGitStatus(res);
    setLoading(false);

    if (!unmounted.current && polling && !intervalId.current && fetchInterval > 2000) {
      intervalId.current = window.setInterval(() => {
        getStatus(id);
      }, fetchInterval);
    }
  };

  const checkout = async (id: string, branch: string) => {
    setLoading(true);

    const res = await window.bridge.git.checkout(id, branch);
    setLoading(false);
    return res;
  };

  const pull = async (id: string, name: string) => {
    const res = await window.bridge.git.pull(id);

    if (!res.success) {
      (await appToaster).show({
        icon: 'info-sign',
        intent: 'warning',
        message: `${name} pull ${res.message}`,
        timeout: 0
      });
    } else {
      await getStatus(id);
    }
  };

  const mergeTo = async (id: string, from: string, target: string) => {
    if (!from || !target) {
      console.log('no from or target', from, target);
      return;
    }

    try {
      const res = await window.bridge.git.mergeTo(id, from, target);

      console.log(res, 'res:mergeTo');

      if (res.merges?.length) {
        const project = useProjects.getState().projects.find((p) => p.id === id);
        window.bridge.launch.editor(project.filePath, useAppSettings.getState().selectedEditor);

        (await appToaster).show({
          icon: 'info-sign',
          intent: 'warning',
          message: `${res.message}. Conflicts in ${res.merges.length} file(s).`,
          timeout: 0
        });

        return;
      }

      (await appToaster).show({
        icon: 'info-sign',
        intent: res.success ? 'success' : 'warning',
        message: res.message,
        timeout: res.success ? 4000 : 0
      });

      return res.success;
    } catch (e) {
      console.log(e, e.git, 'git');
    }
  };

  useEffect(
    () => () => {
      unmounted.current = true;
      window.clearInterval(intervalId.current);
    },
    []
  );

  return { checkout, getStatus, gitStatus, loading, mergeTo, pull };
};
