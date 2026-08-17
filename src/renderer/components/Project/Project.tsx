import { Button, ButtonGroup, Classes, Collapse, Popover } from '@blueprintjs/core';
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { useFilter } from 'renderer/hooks/useFilter';
import { useGit } from 'renderer/hooks/useGit';
import { useModal } from 'renderer/hooks/useModal';
import { useMountEffect } from 'renderer/hooks/useMountEffect';
import { cn } from 'renderer/utils/cn';
import { filterGroups, filterWorktrees, matchesQuery, worktreeHaystack } from 'renderer/utils/filter';
import { type Project as IProject } from 'types/project';
import { type Worktree } from 'types/worktree';

import { CheckoutCard } from './components/CheckoutCard';
import { Error } from './components/Error';
import { FoldDivider } from './components/FoldDivider';
import { ProjectMenu } from './components/ProjectMenu';
import { QuickActions } from './components/QuickActions';
import { useRepoData } from './hooks/useRepoData';
import {
  buildDetailGroups,
  isCheckoutDone,
  isSettledPull,
  sortWorktreesByActivity
} from './hooks/useRepoData/groupByBranch';

type Props = {
  project: IProject;
};

const expandedKey = (projectId: string, path: string) => `showChecks:${projectId}:${path}`;

// null means the user has never chosen for this card, so a default may apply.
const readExpanded = (projectId: string, path: string): boolean | null => {
  const saved = localStorage.getItem(expandedKey(projectId, path));
  return saved ? JSON.parse(saved) : null;
};

export const Project: FC<Props> = ({ project }) => {
  const { getStatus, gitStatus, loading, pull } = useGit();
  const { gitHubToken } = useAppSettings();
  const { openModal } = useModal();
  const { query } = useFilter();

  const { filePath, groupId, id, name } = project;

  // A repo always has at least its main worktree. Older status payloads and
  // failed `git worktree list` calls leave it undefined — synthesise it so a
  // zero-worktree repo still renders exactly one card.
  const worktrees: Worktree[] = useMemo(() => {
    if (gitStatus?.worktrees?.length) return gitStatus.worktrees;
    if (!gitStatus?.branchSummary?.current) return [];

    return [{ branch: gitStatus.branchSummary.current, isMain: true, path: filePath }];
  }, [filePath, gitStatus]);

  // Each card opens on its own; the repo switch drives them all at once.
  // Fetching runs costs API budget, so a repo is only polled while at least
  // one of its cards is open.
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({});
  const [showMerged, setShowMerged] = useState(false);
  const openedForPull = useRef<Set<string>>(new Set());

  const anyExpanded = worktrees.some(({ path }) => expandedPaths[path]);
  const allExpanded = worktrees.length > 0 && worktrees.every(({ path }) => expandedPaths[path]);
  const worktreeBranches = useMemo(() => worktrees.map((worktree) => worktree.branch), [worktrees]);

  const {
    clearHiddenPulls,
    getOrphanPulls,
    getOrphanRuns,
    hiddenPullCount,
    hidePull,
    pullsByBranch,
    refresh,
    runsByBranch,
    runsLoaded
  } = useRepoData(project, anyExpanded, worktreeBranches, query);

  // Worktrees arrive asynchronously — seed each new card from its saved state,
  // defaulting to open when the checkout has an open pull request.
  useEffect(() => {
    setExpandedPaths((prev) => {
      const unseen = worktrees.filter(({ path }) => !(path in prev));
      if (unseen.length === 0) return prev;

      const next = { ...prev };
      for (const { branch, isMain, path } of unseen) {
        const hasOpen = (pullsByBranch[branch] ?? []).some((item) => !isSettledPull(item));
        // Main opens by default: it holds the repo's own runs and every pull
        // request no worktree claims, which is the first thing worth seeing.
        next[path] = readExpanded(id, path) ?? (isMain || hasOpen);
      }
      return next;
    });
  }, [id, pullsByBranch, worktrees]);

  // A pull request opened after the card was seeded opens it too — once, and
  // never against an explicit collapse the user chose themselves.
  useEffect(() => {
    for (const { branch, path } of worktrees) {
      if (openedForPull.current.has(path)) continue;
      if (readExpanded(id, path) !== null) continue;
      if (!(pullsByBranch[branch] ?? []).some((item) => !isSettledPull(item))) continue;

      openedForPull.current.add(path);
      setExpandedPaths((prev) => ({ ...prev, [path]: true }));
    }
  }, [id, pullsByBranch, worktrees]);

  const toggleExpanded = useCallback(
    (path: string) => {
      setExpandedPaths((prev) => {
        const next = !prev[path];
        localStorage.setItem(expandedKey(id, path), JSON.stringify(next));
        return { ...prev, [path]: next };
      });
    },
    [id]
  );

  // The repo switch is a master: open everything, or close everything.
  const toggleAll = useCallback(() => {
    setExpandedPaths((prev) => {
      // Expand unless everything is already expanded. Keyed off `some`, a half
      // open list collapsed on the first click and only opened on the second.
      const next = !worktrees.every(({ path }) => prev[path]);
      const updated = { ...prev };

      for (const { path } of worktrees) {
        updated[path] = next;
        localStorage.setItem(expandedKey(id, path), JSON.stringify(next));
      }

      return updated;
    });
  }, [id, worktrees]);

  // The navbar filter narrows the list: a repo whose own name matches keeps
  // every checkout, otherwise only matching checkouts (and main, the header)
  // survive — and a repo with no survivors renders nothing at all.
  const projectMatched = matchesQuery(`${name} ${gitStatus?.organization ?? ''}`, query);
  const visibleWorktrees = useMemo(
    () =>
      filterWorktrees(worktrees, query, projectMatched, (worktree) =>
        // Main is the repo's catch-all, so it answers for every run and pull
        // request no worktree claims as well as its own.
        worktree.isMain
          ? worktreeHaystack(worktree, Object.values(runsByBranch).flat(), Object.values(pullsByBranch).flat())
          : worktreeHaystack(worktree, runsByBranch[worktree.branch], pullsByBranch[worktree.branch])
      ),
    [projectMatched, pullsByBranch, query, runsByBranch, worktrees]
  );

  // Checkouts with an open pull request, then ones with CI runs, come first.
  const sortedWorktrees = useMemo(
    () => sortWorktreesByActivity(visibleWorktrees, runsByBranch, pullsByBranch),
    [pullsByBranch, runsByBranch, visibleWorktrees]
  );

  const updateProject = () => {
    refresh();
    getStatus(id);
  };

  const runPull = async () => {
    await pull(id, name);
    refresh();
  };

  const removeAlert = () => {
    openModal({
      name: 'remove:project',
      props: { id, name }
    });
  };

  useMountEffect(() => {
    getStatus(id, true);
  });

  const orphans = getOrphanPulls(worktreeBranches)
    .filter(({ tags }) => tags.length > 0)
    .filter((item) => !isSettledPull(item));

  // Runs on branches nobody has checked out. Those matching an orphan pull
  // nest under it; the rest render on their own beneath the main card.
  const orphanedRuns = getOrphanRuns(worktreeBranches);
  const orphanPullBranches = new Set(orphans.map(({ pull }) => pull.head?.ref));
  const unpulledOrphanRuns = Object.entries(orphanedRuns)
    .filter(([branch]) => !orphanPullBranches.has(branch))
    .flatMap(([, runs]) => runs);

  const groupsFor = (worktree: Worktree) => {
    const pulls = pullsByBranch[worktree.branch] ?? [];
    // A checkout kept because its branch matched shows everything it has; one
    // kept because a workflow or pull request inside it matched shows only that.
    const narrow = (groups: ReturnType<typeof buildDetailGroups>) =>
      filterGroups(groups, query, projectMatched || matchesQuery(worktree.branch, query));

    if (!worktree.isMain) return narrow(buildDetailGroups(pulls, runsByBranch, worktree.branch));

    const own = buildDetailGroups(pulls, runsByBranch, worktree.branch);
    const stray = buildDetailGroups(orphans, runsByBranch, '').map((group) => ({ ...group, orphan: true }));
    const strayRuns = unpulledOrphanRuns.length > 0 ? [{ orphan: true, runs: unpulledOrphanRuns }] : [];

    return narrow([...own, ...stray, ...strayRuns]);
  };
  const liveWorktrees = sortedWorktrees.filter(
    (worktree) => worktree.isMain || !isCheckoutDone(pullsByBranch[worktree.branch])
  );
  const mergedWorktrees = sortedWorktrees.filter(
    (worktree) => !worktree.isMain && isCheckoutDone(pullsByBranch[worktree.branch])
  );
  const behind = gitStatus?.status?.behind ?? 0;

  // Nothing in this repo answers the filter — drop it out of the list.
  if (query.trim() && visibleWorktrees.length === 0) return null;

  if (gitStatus && !gitStatus.success) {
    return (
      <Error
        name={name}
        removeAlert={removeAlert}
      />
    );
  }

  const renderCheckout = (worktree: Worktree) => (
    <CheckoutCard
      done={isCheckoutDone(pullsByBranch[worktree.branch])}
      expanded={Boolean(expandedPaths[worktree.path])}
      gitStatus={worktree.isMain ? gitStatus : undefined}
      groups={groupsFor(worktree)}
      key={worktree.path}
      leading={
          worktree.isMain ? (
            <div className={cn('flex flex-col shrink-0 max-w-[160px]', loading && !gitStatus && Classes.SKELETON)}>
              <div className="font-medium truncate">{name}</div>

              <div className="text-[11px] font-light -mt-0.5 truncate dark:text-bp-gray-3">
                {gitStatus?.organization ?? 'Local git'}
              </div>
            </div>
          ) : undefined
        }
      onHidePull={hidePull}
      onRefresh={updateProject}
      onToggleExpanded={() => toggleExpanded(worktree.path)}
      project={project}
      runsLoaded={runsLoaded}
      trailing={
          worktree.isMain ? (
            <div className={cn('flex items-center gap-2.5', !gitStatus && Classes.SKELETON)}>
              <QuickActions
                gitStatus={gitStatus}
                showDetails={allExpanded}
                toggleDetails={toggleAll}
              />

              <ButtonGroup large>
                {/* One slot, one action: behind commits make pulling the only
                    thing worth clicking, so it takes the refresh button's
                    place. Both stay in the menu. */}
                {behind > 0 ? (
                  <Button
                    icon="arrow-down"
                    intent="warning"
                    loading={loading}
                    onClick={runPull}
                  />
                ) : (
                  <Button
                    icon="refresh"
                    onClick={updateProject}
                  />
                )}

                <Popover
                  content={
                    <ProjectMenu
                      clearHiddenPulls={clearHiddenPulls}
                      filePath={filePath}
                      getStatus={updateProject}
                      gitStatus={gitStatus}
                      groupId={groupId}
                      hiddenPullCount={hiddenPullCount}
                      id={id}
                      name={name}
                      pull={runPull}
                      removeProject={removeAlert}
                    />
                  }
                  placement="auto-end"
                >
                  <Button
                    icon="caret-down"
                    intent={behind ? 'warning' : 'none'}
                  />
                </Popover>
              </ButtonGroup>
            </div>
          ) : undefined
        }
      worktree={worktree}
    />
  );

  return (
    <>
      {!gitHubToken && worktrees.length > 0 && (
        <div className={cn('py-1.5 pl-5 pr-4 text-[11px]', Classes.TEXT_MUTED)}>
          Set GitHub token in settings to see actions and pull requests
        </div>
      )}

      {liveWorktrees.map(renderCheckout)}

      {mergedWorktrees.length > 0 && (
        <FoldDivider
          hideLabel={`Hide ${mergedWorktrees.length} merged worktree${mergedWorktrees.length > 1 ? 's' : ''}`}
          onToggle={() => setShowMerged((prev) => !prev)}
          open={showMerged}
          showLabel={`Show ${mergedWorktrees.length} merged worktree${mergedWorktrees.length > 1 ? 's' : ''}`}
        />
      )}

      <Collapse isOpen={showMerged}>{mergedWorktrees.map(renderCheckout)}</Collapse>
    </>
  );
};
