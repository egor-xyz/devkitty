import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn().mockResolvedValue('invoked') }));

vi.mock('electron', () => ({
  ipcRenderer: { invoke }
}));

import { demoBridge } from './bridge';
import { claudeAccounts, codexAccounts, cursorAccounts, runsById } from './data';

describe('demoBridge gitAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves the new PR mutations as success so the demo cards react', async () => {
    await expect(demoBridge.gitAPI.mergePR()).resolves.toMatchObject({ success: true });
    await expect(demoBridge.gitAPI.updateBranch()).resolves.toMatchObject({ success: true });
    await expect(demoBridge.gitAPI.enableAutoMerge()).resolves.toMatchObject({ success: true });
    await expect(demoBridge.gitAPI.disableAutoMerge()).resolves.toMatchObject({ success: true });
  });

  it('returns the canned conflicting files for a dirty PR', async () => {
    const res = await demoBridge.gitAPI.getConflictFiles('p', 143);

    expect(res.success).toBe(true);
    expect(res.files.length).toBeGreaterThan(0);
  });

  it('returns a rich getPRChecks object for a scripted PR', async () => {
    const res = await demoBridge.gitAPI.getPRChecks('p', 142);

    expect(res.success).toBe(true);
    expect(res.review?.state).toBe('approved');
    expect(res.review.reviewers.length).toBeGreaterThan(0);
    expect(res.allowedMergeMethods.length).toBeGreaterThan(0);
    expect(res.unresolvedThreads.length).toBeGreaterThan(0);
  });

  it('falls back to a neutral getPRChecks object for an unknown PR', async () => {
    const res = await demoBridge.gitAPI.getPRChecks('p', 999999);

    expect(res).toMatchObject({
      allowedMergeMethods: [],
      autoMergeEnabled: false,
      mergeableState: 'unknown',
      review: null,
      success: true
    });
  });
});

describe('demoBridge window', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes pinned appearance through the real window IPC so it works in demo', () => {
    demoBridge.window.setPinnedAppearance(true, 0.73);
    expect(invoke).toHaveBeenCalledWith('window:setPinnedAppearance', true, 0.73);

    demoBridge.window.getPinnedAppearance();
    expect(invoke).toHaveBeenCalledWith('window:getPinnedAppearance');
  });
});

describe('demoBridge updater', () => {
  it('stays idle and never calls the real update IPC', async () => {
    vi.clearAllMocks();
    const onState = vi.fn();
    await expect(demoBridge.updater.getState()).resolves.toEqual({ status: 'idle' });
    const unsubscribe = demoBridge.updater.onState(onState);
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
    await expect(demoBridge.updater.download()).resolves.toBeUndefined();
    await expect(demoBridge.updater.install()).resolves.toBeUndefined();
    expect(onState).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe('demoBridge claude', () => {
  it('resolves the canned Claude account list', async () => {
    const accounts = await demoBridge.claude.accounts();

    expect(accounts.length).toBeGreaterThan(0);
    expect(accounts[0]).toMatchObject({ dir: expect.any(String), label: expect.any(String) });
  });

  it('resolves a fixed detect result so the demo always shows Claude as installed', async () => {
    await expect(demoBridge.claude.detect()).resolves.toMatchObject({ installed: true, version: '2.0.14' });
  });

  it('resolves usage for a known account dir', async () => {
    const usage = await demoBridge.claude.usage({ dir: claudeAccounts[0].dir });

    expect(usage.account).toMatchObject({ dir: claudeAccounts[0].dir });
    expect(usage.metrics).toHaveLength(2);
    expect(usage.metrics[1].tokens).toBeGreaterThan(0);
  });

  it('falls back to the first account usage for an unknown account dir', async () => {
    const usage = await demoBridge.claude.usage({ dir: '/nowhere' });

    expect(usage.account).toMatchObject({ dir: claudeAccounts[0].dir });
  });
});

describe('demoBridge codex', () => {
  it('keeps usage scoped to each Codex profile', async () => {
    expect(await demoBridge.codex.accounts()).toEqual(codexAccounts);
    const usages = await Promise.all(codexAccounts.map((account) => demoBridge.codex.usage(account)));
    expect(usages.map((usage) => usage.account.dir)).toEqual(codexAccounts.map((account) => account.dir));
    expect(usages[0].account.dir).not.toBe(usages[1].account.dir);
    await expect(demoBridge.codex.usage({ dir: claudeAccounts[0].dir })).rejects.toThrow('Unknown Codex profile');
  });
});

describe('demoBridge cursor', () => {
  it('shows IDE, CLI, and Grok as one Cursor account', async () => {
    expect(await demoBridge.cursor.accounts()).toEqual(cursorAccounts);
    const usage = await demoBridge.cursor.usage(cursorAccounts[0]);
    expect(usage.metrics.map(({ id }) => id)).toEqual(['cursor-models', 'other-models']);
    expect(usage.spend?.label).toBe('On-demand');
    expect(usage.account.surfaces).toEqual(['ide', 'cli', 'grok-bot']);
  });
});

describe('demoBridge AI usage credentials', () => {
  it('returns saved status without returning a key', async () => {
    await demoBridge.aiUsageCredentials.set('openai', 'sk-admin-demo');
    expect(await demoBridge.aiUsageCredentials.status()).toEqual({ anthropic: false, openai: true });
    await demoBridge.aiUsageCredentials.clear('openai');
    expect(await demoBridge.aiUsageCredentials.status()).toEqual({ anthropic: false, openai: false });
  });
});

describe('demoBridge darkMode', () => {
  it('resolves the no-op theme controls without throwing', async () => {
    await expect(demoBridge.darkMode.on()).resolves.toBeUndefined();
    await expect(demoBridge.darkMode.set()).resolves.toBeUndefined();
    await expect(demoBridge.darkMode.toggle()).resolves.toBeUndefined();
  });
});

describe('demoBridge git', () => {
  it('resolves canned success objects for the simple git mutations', async () => {
    await expect(demoBridge.git.checkout()).resolves.toMatchObject({ message: 'Switched branch', success: true });
    await expect(demoBridge.git.mergeTo()).resolves.toMatchObject({ merges: [], success: true });
    await expect(demoBridge.git.pull()).resolves.toMatchObject({ message: 'Already up to date', success: true });
    await expect(demoBridge.git.reset()).resolves.toMatchObject({ message: 'Reset', success: true });
  });

  it('returns the rich git status for a known project id', async () => {
    const res = await demoBridge.git.getStatus('p-web');

    expect(res.success).toBe(true);
    expect(res.worktrees.length).toBeGreaterThan(0);
    expect(res.status.isClean).toBe(false);
  });

  it('returns a not-found status for an unknown project id', async () => {
    await expect(demoBridge.git.getStatus('nope')).resolves.toMatchObject({ message: 'Not found', success: false });
  });
});

describe('demoBridge gitAPI extra', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves the fire-and-forget run/job mutations as success', async () => {
    await expect(demoBridge.gitAPI.cancelRun()).resolves.toMatchObject({ success: true });
    await expect(demoBridge.gitAPI.rerunFailedJobs()).resolves.toMatchObject({ success: true });
    await expect(demoBridge.gitAPI.rerunWorkflow()).resolves.toMatchObject({ success: true });
    await expect(demoBridge.gitAPI.reset()).resolves.toMatchObject({ message: 'Branch reset', success: true });
    await expect(demoBridge.gitAPI.getPinnedRuns()).resolves.toMatchObject({ runs: [], success: true });
    await expect(demoBridge.gitAPI.searchRuns()).resolves.toMatchObject({ runs: [], success: true });
    await expect(demoBridge.gitAPI.getRunsPage()).resolves.toMatchObject({ last: true, runs: [], success: true });
  });

  it('returns the open pulls for a known project and an empty list for an unknown one', async () => {
    const known = await demoBridge.gitAPI.getOpenPulls('p-web');
    expect(known.pulls.length).toBeGreaterThan(0);

    const unknown = await demoBridge.gitAPI.getOpenPulls('nope');
    expect(unknown.pulls).toEqual([]);
  });

  it('returns the runs for a known project and an empty list for an unknown one', async () => {
    const known = await demoBridge.gitAPI.getRuns('p-web');
    expect(known.runs.length).toBeGreaterThan(0);

    const unknown = await demoBridge.gitAPI.getRuns('nope');
    expect(unknown.runs).toEqual([]);
  });

  it('filters getPulls by author, by review-requested, and falls back to empty otherwise', async () => {
    const authored = await demoBridge.gitAPI.getPulls('p-web', 'author');
    expect(authored.pulls).toEqual([{ number: 142 }]);

    const reviewRequested = await demoBridge.gitAPI.getPulls('p-web', 'review-requested');
    expect(reviewRequested.pulls.map((p) => p.number).sort()).toEqual([138, 144]);

    const other = await demoBridge.gitAPI.getPulls('p-web', 'something-else');
    expect(other.pulls).toEqual([]);

    const unknownProject = await demoBridge.gitAPI.getPulls('nope', 'author');
    expect(unknownProject.pulls).toEqual([]);
  });

  it('derives jobs from the run state: running, failed, and passed', async () => {
    const allRuns = Object.values(runsById).flat();
    const runningRun = allRuns.find((r) => !r.conclusion);
    const failedRun = allRuns.find((r) => r.conclusion === 'failure');
    const passedRun = allRuns.find((r) => r.conclusion === 'success');

    expect(runningRun).toBeTruthy();
    expect(failedRun).toBeTruthy();
    expect(passedRun).toBeTruthy();

    const running = await demoBridge.gitAPI.getJobs('p-web', runningRun.id);
    expect(running.jobs.length).toBeGreaterThan(0);
    expect(running.jobs.some((j) => j.status === 'in_progress' || j.status === 'queued')).toBe(true);

    const failed = await demoBridge.gitAPI.getJobs('p-web', failedRun.id);
    expect(failed.jobs.some((j) => j.conclusion === 'failure')).toBe(true);

    const passed = await demoBridge.gitAPI.getJobs('p-web', passedRun.id);
    expect(passed.jobs.every((j) => j.conclusion !== 'failure')).toBe(true);

    // An id that matches no run at all also falls back to the "running" shape.
    const unknown = await demoBridge.gitAPI.getJobs('p-web', -1);
    expect(unknown.jobs.length).toBeGreaterThan(0);
  });
});

describe('demoBridge launch, notification, and sticker', () => {
  it('resolves the no-op launch, notification, and sticker actions without throwing', async () => {
    await expect(demoBridge.launch.editor()).resolves.toBeUndefined();
    await expect(demoBridge.launch.shell()).resolves.toBeUndefined();
    await expect(demoBridge.notification.show()).resolves.toBeUndefined();
    await expect(demoBridge.sticker.add()).resolves.toBeUndefined();
  });
});

describe('demoBridge projects', () => {
  it('resolves the canned project CRUD shapes', async () => {
    await expect(demoBridge.projects.add()).resolves.toMatchObject({ canceled: true, success: false });

    const got = await demoBridge.projects.get();
    expect(got.length).toBeGreaterThan(0);

    const removed = await demoBridge.projects.remove();
    expect(removed.length).toBeGreaterThan(0);

    const updated = await demoBridge.projects.update();
    expect(updated.length).toBeGreaterThan(0);
  });
});

describe('demoBridge settings', () => {
  it('reads a stored key and merges a partial update into appSettings', async () => {
    const before = await demoBridge.settings.get('appSettings');
    expect(before.theme).toBe('sunset');

    await demoBridge.settings.set('appSettings', { theme: 'midnight' });
    const after = await demoBridge.settings.get('appSettings');

    expect(after.theme).toBe('midnight');
    // Unrelated fields survive the merge.
    expect(after.gitHubToken).toBe('demo-token');

    // Restore so other tests reading appSettings see the original value.
    await demoBridge.settings.set('appSettings', { theme: 'sunset' });
  });

  it('overwrites a non-appSettings key outright', async () => {
    await demoBridge.settings.set('demoTestKey', { a: 1 });
    await expect(demoBridge.settings.get('demoTestKey')).resolves.toEqual({ a: 1 });

    await demoBridge.settings.set('demoTestKey', { b: 2 });
    await expect(demoBridge.settings.get('demoTestKey')).resolves.toEqual({ b: 2 });
  });

  it('resolves the onAppSettings subscription no-op', async () => {
    await expect(demoBridge.settings.onAppSettings()).resolves.toBeUndefined();
  });
});

describe('demoBridge worktree', () => {
  it('resolves canned success objects for the worktree mutations', async () => {
    await expect(demoBridge.worktree.add()).resolves.toMatchObject({ message: 'Worktree added', success: true });
    await expect(demoBridge.worktree.pull()).resolves.toMatchObject({ message: 'Up to date', success: true });
    await expect(demoBridge.worktree.remove()).resolves.toMatchObject({ message: 'Worktree removed', success: true });
    await expect(demoBridge.worktree.getStatus()).resolves.toMatchObject({ status: { ahead: 0, behind: 0, modified: [] }, success: true });
  });

  it('lists worktrees for a known project and an empty list for an unknown one', async () => {
    const known = await demoBridge.worktree.list('p-web');
    expect(known.worktrees.length).toBeGreaterThan(0);

    const unknown = await demoBridge.worktree.list('nope');
    expect(unknown.worktrees).toEqual([]);
  });
});
