import { useEffect, useRef, useState } from 'react';
import { appToaster } from 'renderer/utils/appToaster';
import { type GitStatus } from 'types/project';

import { useAppSettings } from './useAppSettings';
import { useProjects } from './useProjects';

export const useGit = () => {
  const { fetchInterval } = useAppSettings();

  const [gitStatus, setGitStatus] = useState<GitStatus>();
  const [loading, setLoading] = useState(false);
  // Which project this hook keeps polling. State, not a ref, so changing the
  // interval or hiding the window can rebuild the timer.
  const [polledId, setPolledId] = useState<string>();

  const inFlight = useRef(false);
  const unmounted = useRef(false);

  /**
   * `polling` asks the hook to keep this project's status fresh from now on.
   * `silent` is for those repeat reads: they must not flip `loading`, or every
   * tick would flash the skeletons.
   */
  const getStatus = async (id: string, polling = true, silent = false) => {
    if (polling) setPolledId(id);
    if (inFlight.current) return;

    inFlight.current = true;
    if (!silent) setLoading(true);

    const res = await window.bridge.git.getStatus(id);
    inFlight.current = false;

    if (unmounted.current) return;

    setGitStatus(res);
    if (!silent) setLoading(false);
  };

  // One timer, rebuilt whenever the project or the interval changes, and idle
  // while the window is hidden — a background window polling git and fetching
  // from every remote every few seconds buys nothing.
  useEffect(() => {
    if (!polledId || fetchInterval <= 2000) return;

    let timer: null | number = null;

    const tick = () => getStatus(polledId, false, true);

    const start = () => {
      if (!timer) timer = window.setInterval(tick, fetchInterval);
    };

    const stop = () => {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
        return;
      }

      tick();
      start();
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
     
  }, [fetchInterval, polledId]);

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

  useEffect(() => () => {
      unmounted.current = true;
    }, []);

  const addWorktree = async (id: string, repoName: string, branch: string, newBranch?: string) => {
    const res = await window.bridge.worktree.add(id, repoName, branch, newBranch);

    if (res.success) {
      await getStatus(id, false);
      (await appToaster).show({
        icon: 'git-new-branch',
        intent: 'success',
        message: res.message
      });
    } else if (res.message !== 'Cancelled') {
      (await appToaster).show({
        icon: 'info-sign',
        intent: 'warning',
        message: res.message,
        timeout: 0
      });
    }

    return res;
  };

  const removeWorktree = async (id: string, worktreePath: string) => {
    const res = await window.bridge.worktree.remove(id, worktreePath);

    if (res.success) {
      await getStatus(id, false);
      (await appToaster).show({
        icon: 'trash',
        intent: 'success',
        message: res.message
      });
    } else {
      (await appToaster).show({
        icon: 'info-sign',
        intent: 'warning',
        message: res.message,
        timeout: 0
      });
    }

    return res;
  };

  return { addWorktree, checkout, getStatus, gitStatus, loading, mergeTo, pull, removeWorktree };
};
