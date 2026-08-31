// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { type GitStatus } from 'types/project';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppSettings } from './useAppSettings';
import { useGit } from './useGit';
import { useProjects } from './useProjects';

const { showToast, subscribeMock, unsubscribeMocks } = vi.hoisted(() => {
  const unsubscribeMocks: ReturnType<typeof vi.fn>[] = [];
  const subscribeMock = vi.fn(() => {
    const unsub = vi.fn();
    unsubscribeMocks.push(unsub);
    return unsub;
  });

  return { showToast: vi.fn(), subscribeMock, unsubscribeMocks };
});

vi.mock('renderer/utils/appToaster', () => ({
  appToaster: Promise.resolve({ show: showToast })
}));

// `useGit` hands the recurring background poll to the shared poller
// coordinator (`renderer/services/poller`). Mocking `subscribe` lets these
// tests assert *how* the hook drives the coordinator (key, fetch, interval)
// and drive its `onData` callback directly, without running the
// coordinator's real timer/visibility machinery.
vi.mock('renderer/services/poller', () => ({
  subscribe: subscribeMock
}));

type GitStatusPollSpec = { fetch: () => Promise<GitStatus>; interval: (data?: GitStatus) => number; key: string };

const lastSubscription = () => {
  const call = subscribeMock.mock.calls.at(-1);
  if (!call) throw new Error('subscribe() was never called');
  const [spec, onData] = call as [GitStatusPollSpec, (data: GitStatus) => void];
  return { onData, spec };
};

// Waits for one microtask tick so pending promise callbacks (e.g. from
// `await window.bridge.git.getStatus(...)`) have a chance to run inside `act`.
const flush = () => act(async () => {
  await Promise.resolve();
  await Promise.resolve();
});

describe('useGit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    unsubscribeMocks.length = 0;

    useAppSettings.setState({ fetchInterval: 10000 });
    useProjects.setState({ projects: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getStatus', () => {
    it('fetches the git status and stores it while toggling loading on and off', async () => {
      const status = { success: true };
      vi.mocked(window.bridge.git.getStatus).mockResolvedValue(status);

      const { result } = renderHook(() => useGit());

      let promise: Promise<void>;
      act(() => {
        promise = result.current.getStatus('project-1', false);
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        await promise;
      });

      expect(window.bridge.git.getStatus).toHaveBeenCalledWith('project-1');
      expect(result.current.gitStatus).toEqual(status);
      expect(result.current.loading).toBe(false);
    });

    it('does not toggle loading when called silently', async () => {
      vi.mocked(window.bridge.git.getStatus).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useGit());

      await act(async () => {
        await result.current.getStatus('project-1', false, true);
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.gitStatus).toEqual({ success: true });
    });

    // The coordinator (mocked out here) owns fetch-dedupe for its own ticks;
    // a manual `getStatus` call is a direct, ungated bridge call now that the
    // old `inFlight` ref is gone, so two concurrent manual calls do fetch
    // twice — a deliberate behavior change from the pre-migration hook.
    it('performs a separate fetch for each concurrent manual call', async () => {
      let resolveFirst: (value: { success: boolean }) => void;
      const firstRead = new Promise<{ success: boolean }>((resolve) => {
        resolveFirst = resolve;
      });
      vi.mocked(window.bridge.git.getStatus).mockReturnValueOnce(firstRead).mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useGit());

      let firstCall: Promise<void>;
      let secondCall: Promise<void>;
      act(() => {
        firstCall = result.current.getStatus('project-1', false);
        secondCall = result.current.getStatus('project-1', false);
      });

      expect(window.bridge.git.getStatus).toHaveBeenCalledTimes(2);

      await act(async () => {
        resolveFirst({ success: true });
        await firstCall;
        await secondCall;
      });

      expect(window.bridge.git.getStatus).toHaveBeenCalledTimes(2);
    });

    it('ignores a resolved read after the component has unmounted', async () => {
      let resolveRead: (value: { success: boolean }) => void;
      const pendingRead = new Promise<{ success: boolean }>((resolve) => {
        resolveRead = resolve;
      });
      vi.mocked(window.bridge.git.getStatus).mockReturnValueOnce(pendingRead);

      const { result, unmount } = renderHook(() => useGit());

      let call: Promise<void>;
      act(() => {
        call = result.current.getStatus('project-1', false);
      });

      unmount();

      await act(async () => {
        resolveRead({ success: true });
        await call;
      });

      // No state update happened (and no "state update on an unmounted
      // component" warning was thrown), so gitStatus remains untouched.
      expect(result.current.gitStatus).toBeUndefined();
    });
  });

  describe('polling coordinator subscription', () => {
    it('subscribes to gitStatus:<id> when getStatus is called with polling=true', async () => {
      vi.mocked(window.bridge.git.getStatus).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useGit());

      act(() => {
        result.current.getStatus('project-1');
      });
      await flush();

      expect(subscribeMock).toHaveBeenCalledTimes(1);
      expect(lastSubscription().spec.key).toBe('gitStatus:project-1');
    });

    it("the subscription's fetch calls window.bridge.git.getStatus with the polled id", async () => {
      vi.mocked(window.bridge.git.getStatus).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useGit());

      act(() => {
        result.current.getStatus('project-1');
      });
      await flush();

      const { spec } = lastSubscription();
      vi.mocked(window.bridge.git.getStatus).mockClear();
      await spec.fetch();

      expect(window.bridge.git.getStatus).toHaveBeenCalledWith('project-1');
    });

    it('the subscription interval is the configured fetchInterval, or Infinity at/below 2 seconds', async () => {
      vi.mocked(window.bridge.git.getStatus).mockResolvedValue({ success: true });

      const { rerender, result } = renderHook(() => useGit());

      act(() => {
        result.current.getStatus('project-1');
      });
      await flush();

      expect(lastSubscription().spec.interval(undefined)).toBe(10000);

      useAppSettings.setState({ fetchInterval: 2000 });
      rerender();
      await flush();

      expect(lastSubscription().spec.interval(undefined)).toBe(Infinity);
    });

    it("onData from the subscription updates gitStatus silently, never touching loading", async () => {
      vi.mocked(window.bridge.git.getStatus).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useGit());

      act(() => {
        result.current.getStatus('project-1');
      });
      await flush();

      const { onData } = lastSubscription();
      const tickStatus = { branchSummary: { current: 'main' }, success: true } as const;

      act(() => {
        onData(tickStatus as unknown as GitStatus);
      });

      expect(result.current.gitStatus).toEqual(tickStatus);
      // A tick is a background refresh: it must never flip `loading` true.
      expect(result.current.loading).toBe(false);
    });

    it('unsubscribes the old key and subscribes the new key when the polled project id changes', async () => {
      vi.mocked(window.bridge.git.getStatus).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useGit());

      act(() => {
        result.current.getStatus('project-1');
      });
      await flush();
      expect(subscribeMock).toHaveBeenCalledTimes(1);
      const [firstUnsubscribe] = unsubscribeMocks;

      act(() => {
        result.current.getStatus('project-2');
      });
      await flush();

      expect(firstUnsubscribe).toHaveBeenCalledTimes(1);
      expect(subscribeMock).toHaveBeenCalledTimes(2);
      expect(lastSubscription().spec.key).toBe('gitStatus:project-2');
    });

    it('unsubscribes on unmount', async () => {
      vi.mocked(window.bridge.git.getStatus).mockResolvedValue({ success: true });

      const { result, unmount } = renderHook(() => useGit());

      act(() => {
        result.current.getStatus('project-1');
      });
      await flush();
      const [unsub] = unsubscribeMocks;

      unmount();

      expect(unsub).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkout', () => {
    it('checks out a branch and toggles loading around the call', async () => {
      const res = { success: true };
      vi.mocked(window.bridge.git.checkout).mockResolvedValue(res);

      const { result } = renderHook(() => useGit());

      let returned: unknown;
      await act(async () => {
        returned = await result.current.checkout('project-1', 'main');
      });

      expect(window.bridge.git.checkout).toHaveBeenCalledWith('project-1', 'main');
      expect(result.current.loading).toBe(false);
      expect(returned).toEqual(res);
    });
  });

  describe('pull', () => {
    it('shows a warning toast and does not refresh the status when the pull fails', async () => {
      vi.mocked(window.bridge.git.pull).mockResolvedValue({ message: 'failed', success: false });

      const { result } = renderHook(() => useGit());

      await act(async () => {
        await result.current.pull('project-1', 'my-repo');
      });

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ intent: 'warning', message: 'my-repo pull failed' })
      );
      expect(window.bridge.git.getStatus).not.toHaveBeenCalled();
    });

    it('refreshes the status after a successful pull', async () => {
      vi.mocked(window.bridge.git.pull).mockResolvedValue({ success: true });
      vi.mocked(window.bridge.git.getStatus).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useGit());

      await act(async () => {
        await result.current.pull('project-1', 'my-repo');
      });

      expect(window.bridge.git.getStatus).toHaveBeenCalledWith('project-1');
      expect(showToast).not.toHaveBeenCalled();
    });
  });

  describe('mergeTo', () => {
    it('does nothing when either the source or target branch is missing', async () => {
      const { result } = renderHook(() => useGit());

      await act(async () => {
        await result.current.mergeTo('project-1', '', 'main');
      });

      expect(window.bridge.git.mergeTo).not.toHaveBeenCalled();
    });

    it('opens the editor and warns about conflicts when the merge produces them', async () => {
      useProjects.setState({ projects: [{ filePath: '/repo', groupId: undefined, id: 'project-1', name: 'repo' }] });
      vi.mocked(window.bridge.git.mergeTo).mockResolvedValue({
        merges: ['a.ts'],
        message: 'Conflicts found',
        success: false
      });

      const { result } = renderHook(() => useGit());

      await act(async () => {
        await result.current.mergeTo('project-1', 'feature', 'main');
      });

      expect(window.bridge.launch.editor).toHaveBeenCalledWith('/repo', undefined);
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ intent: 'warning', message: expect.stringContaining('Conflicts in 1 file(s)') })
      );
    });

    it('shows a success toast and returns true when the merge succeeds cleanly', async () => {
      vi.mocked(window.bridge.git.mergeTo).mockResolvedValue({ message: 'Merged', success: true });

      const { result } = renderHook(() => useGit());

      let returned: unknown;
      await act(async () => {
        returned = await result.current.mergeTo('project-1', 'feature', 'main');
      });

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ intent: 'success', message: 'Merged', timeout: 4000 })
      );
      expect(returned).toBe(true);
    });

    it('shows a warning toast and returns false when the merge fails without conflicts', async () => {
      vi.mocked(window.bridge.git.mergeTo).mockResolvedValue({ message: 'Merge failed', success: false });

      const { result } = renderHook(() => useGit());

      let returned: unknown;
      await act(async () => {
        returned = await result.current.mergeTo('project-1', 'feature', 'main');
      });

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ intent: 'warning', message: 'Merge failed', timeout: 0 })
      );
      expect(returned).toBe(false);
    });

    it('swallows an error thrown while merging', async () => {
      vi.mocked(window.bridge.git.mergeTo).mockRejectedValue(new Error('boom'));

      const { result } = renderHook(() => useGit());

      await act(async () => {
        await expect(result.current.mergeTo('project-1', 'feature', 'main')).resolves.toBeUndefined();
      });
    });
  });

  describe('addWorktree', () => {
    it('refreshes the status and shows a success toast when the worktree is added', async () => {
      vi.mocked(window.bridge.worktree.add).mockResolvedValue({ message: 'Worktree added', success: true });
      vi.mocked(window.bridge.git.getStatus).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useGit());

      await act(async () => {
        await result.current.addWorktree('project-1', 'my-repo', 'main', 'feature');
      });

      expect(window.bridge.worktree.add).toHaveBeenCalledWith('project-1', 'my-repo', 'main', 'feature');
      expect(window.bridge.git.getStatus).toHaveBeenCalledWith('project-1');
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ intent: 'success', message: 'Worktree added' })
      );
    });

    it('shows a warning toast when adding the worktree fails for a reason other than cancellation', async () => {
      vi.mocked(window.bridge.worktree.add).mockResolvedValue({ message: 'Branch exists', success: false });

      const { result } = renderHook(() => useGit());

      await act(async () => {
        await result.current.addWorktree('project-1', 'my-repo', 'main');
      });

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ intent: 'warning', message: 'Branch exists' })
      );
    });

    it('stays silent when the user cancels adding the worktree', async () => {
      vi.mocked(window.bridge.worktree.add).mockResolvedValue({ message: 'Cancelled', success: false });

      const { result } = renderHook(() => useGit());

      await act(async () => {
        await result.current.addWorktree('project-1', 'my-repo', 'main');
      });

      expect(showToast).not.toHaveBeenCalled();
    });
  });

  describe('removeWorktree', () => {
    it('refreshes the status and shows a success toast when the worktree is removed', async () => {
      vi.mocked(window.bridge.worktree.remove).mockResolvedValue({ message: 'Worktree removed', success: true });
      vi.mocked(window.bridge.git.getStatus).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useGit());

      await act(async () => {
        await result.current.removeWorktree('project-1', '/repo/worktree');
      });

      expect(window.bridge.worktree.remove).toHaveBeenCalledWith('project-1', '/repo/worktree');
      expect(window.bridge.git.getStatus).toHaveBeenCalledWith('project-1');
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ intent: 'success', message: 'Worktree removed' })
      );
    });

    it('shows a warning toast when removing the worktree fails', async () => {
      vi.mocked(window.bridge.worktree.remove).mockResolvedValue({ message: 'In use', success: false });

      const { result } = renderHook(() => useGit());

      await act(async () => {
        await result.current.removeWorktree('project-1', '/repo/worktree');
      });

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ intent: 'warning', message: 'In use' })
      );
    });
  });
});
