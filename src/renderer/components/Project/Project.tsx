import { Button, ButtonGroup, Classes, Popover } from '@blueprintjs/core';
import { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { useGit } from 'renderer/hooks/useGit';
import { useModal } from 'renderer/hooks/useModal';
import { useMountEffect } from 'renderer/hooks/useMountEffect';
import { cn } from 'renderer/utils/cn';
import { type Project as IProject } from 'types/project';
import { type Worktree } from 'types/worktree';

import { CheckoutCard } from './components/CheckoutCard';
import { Error } from './components/Error';
import { ProjectMenu } from './components/ProjectMenu';
import { QuickActions } from './components/QuickActions';
import { useRepoData } from './hooks/useRepoData';
import { buildDetailGroups, sortWorktreesByActivity } from './hooks/useRepoData/groupByBranch';

type Props = {
  project: IProject;
};

const expandedKey = (projectId: string, path: string) => `showChecks:${projectId}:${path}`;

const readExpanded = (projectId: string, path: string): boolean => {
  const saved = localStorage.getItem(expandedKey(projectId, path));
  return saved ? JSON.parse(saved) : false;
};

export const Project: FC<Props> = ({ project }) => {
  const { getStatus, gitStatus, loading, pull } = useGit();
  const { gitHubToken } = useAppSettings();
  const { openModal } = useModal();

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

  const anyExpanded = worktrees.some(({ path }) => expandedPaths[path]);

  const {
    clearHiddenPulls,
    clearHiddenRuns,
    getOrphanPulls,
    getOrphanRuns,
    hiddenPullCount,
    hiddenRunCount,
    hidePull,
    hideRun,
    pullsByBranch,
    refresh,
    runsByBranch,
    runsLoaded
  } = useRepoData(project, anyExpanded);

  // Worktrees arrive asynchronously — seed each new card from its saved state.
  useEffect(() => {
    setExpandedPaths((prev) => {
      const unseen = worktrees.filter(({ path }) => !(path in prev));
      if (unseen.length === 0) return prev;

      const next = { ...prev };
      for (const { path } of unseen) next[path] = readExpanded(id, path);
      return next;
    });
  }, [id, worktrees]);

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
      const next = !worktrees.some(({ path }) => prev[path]);
      const updated = { ...prev };

      for (const { path } of worktrees) {
        updated[path] = next;
        localStorage.setItem(expandedKey(id, path), JSON.stringify(next));
      }

      return updated;
    });
  }, [id, worktrees]);

  // Checkouts with an open pull request, then ones with CI runs, come first.
  const sortedWorktrees = useMemo(
    () => sortWorktreesByActivity(worktrees, runsByBranch, pullsByBranch),
    [pullsByBranch, runsByBranch, worktrees]
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

  const ignoreWorkflow = (workflowName: string, workflowPath: string) => {
    openModal({ name: 'ignore:workflow', props: { workflowName, workflowPath } });
  };

  useMountEffect(() => {
    getStatus(id, true);
  });

  const worktreeBranches = worktrees.map((worktree) => worktree.branch);
  const orphans = getOrphanPulls(worktreeBranches).filter(({ tags }) => tags.length > 0);

  // Runs on branches nobody has checked out. Those matching an orphan pull
  // nest under it; the rest render on their own beneath the main card.
  const orphanedRuns = getOrphanRuns(worktreeBranches);
  const orphanPullBranches = new Set(orphans.map(({ pull }) => pull.head?.ref));
  const unpulledOrphanRuns = Object.entries(orphanedRuns)
    .filter(([branch]) => !orphanPullBranches.has(branch))
    .flatMap(([, runs]) => runs);

  const groupsFor = (worktree: Worktree) => {
    const pulls = pullsByBranch[worktree.branch] ?? [];
    if (!worktree.isMain) return buildDetailGroups(pulls, runsByBranch, worktree.branch);

    const groups = buildDetailGroups([...pulls, ...orphans], runsByBranch, worktree.branch);
    return unpulledOrphanRuns.length > 0 ? [...groups, { runs: unpulledOrphanRuns }] : groups;
  };
  const behind = gitStatus?.status?.behind ?? 0;

  if (gitStatus && !gitStatus.success) {
    return (
      <Error
        name={name}
        removeAlert={removeAlert}
      />
    );
  }

  return (
    <>
      {!gitHubToken && worktrees.length > 0 && (
        <div className={cn('py-1.5 pl-5 pr-4 text-[11px]', Classes.TEXT_MUTED)}>
          Set GitHub token in settings to see actions and pull requests
        </div>
      )}

      {sortedWorktrees.map((worktree) => (
        <CheckoutCard
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
          onHideRun={hideRun}
          onIgnoreWorkflow={ignoreWorkflow}
          onRefresh={updateProject}
          onToggleExpanded={() => toggleExpanded(worktree.path)}
          project={project}
          runsLoaded={runsLoaded}
          trailing={
            worktree.isMain ? (
              <div className={cn('flex items-center gap-2.5', !gitStatus && Classes.SKELETON)}>
                <QuickActions
                  gitStatus={gitStatus}
                  onUpdate={updateProject}
                  project={project}
                  showDetails={anyExpanded}
                  toggleDetails={toggleAll}
                />

                <ButtonGroup large>
                  <Button
                    icon="refresh"
                    onClick={updateProject}
                  />

                  <Popover
                    content={
                      <ProjectMenu
                        clearHiddenPulls={clearHiddenPulls}
                        clearHiddenRuns={clearHiddenRuns}
                        filePath={filePath}
                        getStatus={updateProject}
                        gitStatus={gitStatus}
                        groupId={groupId}
                        hiddenCount={hiddenRunCount}
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
      ))}
    </>
  );
};
