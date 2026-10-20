// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { type Run } from 'types/gitHub';
import { type Project } from 'types/project';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRepoData } from './useRepoData';

type RunsHandler = (data: { arm: boolean; res: { runs: Run[]; success: boolean } }) => void;

const mocks = vi.hoisted(() => ({ handlers: new Map<string, (data: unknown) => void>() }));

vi.mock('renderer/hooks/useAppSettings', () => ({
  useAppSettings: () => ({
    fetchInterval: 10000,
    gitHubActions: { ignoreDependabot: false, ignoredWorkflows: [] as string[], notifications: true },
    gitHubPulls: { pollInterval: 60000 },
    gitHubToken: 'token'
  })
}));
vi.mock('renderer/services/poller', () => ({
  refresh: vi.fn(),
  subscribe: (spec: { key: string }, handler: (data: unknown) => void) => {
    mocks.handlers.set(spec.key.split(':')[0], handler);
    return () => {};
  }
}));

const project = { id: 'p1', name: 'proj' } as unknown as Project;
const run = (conclusion: null | string): Run =>
  ({
    conclusion,
    display_title: 'title',
    event: 'push',
    head_branch: 'feature',
    id: 1,
    name: 'CI',
    run_number: 7
  }) as unknown as Run;

const show = vi.fn();
const setFocus = (focused: boolean) => {
  document.hasFocus = () => focused;
};
const sendRuns = (runs: Run[]) =>
  act(() => (mocks.handlers.get('runs') as RunsHandler)({ arm: true, res: { runs, success: true } }));

const setup = () => {
  const hook = renderHook(({ branches }) => useRepoData(project, true, branches, 'main'), {
    initialProps: { branches: ['main'] }
  });
  // Armed fetch primes the in-flight run as `null`.
  sendRuns([run(null)]);

  return hook;
};

describe('useRepoData run notifications', () => {
  beforeEach(() => {
    mocks.handlers.clear();
    show.mockClear();
    (window as unknown as { bridge: { notification: { show: typeof show } } }).bridge.notification = { show };
  });

  afterEach(() => {
    cleanup();
    setFocus(true);
  });

  it('defers a finished run on an unknown branch while unfocused, then notifies once after the branch appears', () => {
    setFocus(false);
    const { rerender } = setup();

    sendRuns([run('success')]);
    expect(show).not.toHaveBeenCalled();

    setFocus(true);
    rerender({ branches: ['main', 'feature'] });
    sendRuns([run('success')]);
    expect(show).toHaveBeenCalledTimes(1);

    // Recorded now, so later polls of the same run stay quiet.
    sendRuns([run('success')]);
    expect(show).toHaveBeenCalledTimes(1);
  });

  it('keeps deferring when runs land right after focus, before the branch is known', () => {
    setFocus(false);
    const { rerender } = setup();

    setFocus(true);
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    sendRuns([run('success')]);
    expect(show).not.toHaveBeenCalled();

    rerender({ branches: ['main', 'feature'] });
    sendRuns([run('success')]);
    expect(show).toHaveBeenCalledTimes(1);
  });

  it('records an unknown-branch run once the focus grace period has passed', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      setFocus(false);
      const { rerender } = setup();

      setFocus(true);
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });
      vi.advanceTimersByTime(31_000);
      sendRuns([run('success')]);
      rerender({ branches: ['main', 'feature'] });
      sendRuns([run('success')]);

      expect(show).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('records a finished run on an unknown branch while focused, so it never notifies later', () => {
    const { rerender } = setup();

    sendRuns([run('success')]);
    rerender({ branches: ['main', 'feature'] });
    sendRuns([run('success')]);

    expect(show).not.toHaveBeenCalled();
  });

  it('notifies once for a known branch while unfocused', () => {
    setFocus(false);
    const hook = renderHook(() => useRepoData(project, true, ['main', 'feature'], 'main'));
    sendRuns([run(null)]);

    sendRuns([run('success')]);
    sendRuns([run('success')]);

    expect(show).toHaveBeenCalledTimes(1);
    hook.unmount();
  });
});
