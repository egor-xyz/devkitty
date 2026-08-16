import { Button, Classes, Colors, Icon, Popover } from '@blueprintjs/core';
import { type FC, Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGit } from 'renderer/hooks/useGit';
import { useModal } from 'renderer/hooks/useModal';
import { useMountEffect } from 'renderer/hooks/useMountEffect';
import { cn } from 'renderer/utils/cn';
import { type Project as IProject } from 'types/project';
import { type Worktree } from 'types/worktree';

import { CheckoutCard } from './components/CheckoutCard';
import { Error } from './components/Error';
import { ProjectMenu } from './components/ProjectMenu';
import { PullRequest } from './components/PullRequest';
import { useRepoData } from './hooks/useRepoData';

type Props = {
  project: IProject;
};

const expandedKey = (projectId: string, path: string) => `showChecks:${projectId}:${path}`;

const readExpanded = (projectId: string, path: string): boolean | null => {
  const saved = localStorage.getItem(expandedKey(projectId, path));
  return saved ? JSON.parse(saved) : null;
};

export const Project: FC<Props> = ({ project }) => {
  const { getStatus, gitStatus, loading, pull } = useGit();
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

  // Expand state lives here, not in the cards: fetching runs costs API budget,
  // so a repo is only polled while at least one of its cards is expanded.
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({});
  const autoExpanded = useRef<Set<string>>(new Set());

  // The menu opens in a portal, so focus leaves the header and `focus-within`
  // drops — without this the ⋯ would fade out under its own open menu.
  const [menuOpen, setMenuOpen] = useState(false);

  const anyExpanded = worktrees.some(({ path }) => expandedPaths[path]);

  const {
    clearHiddenPulls,
    clearHiddenRuns,
    getOrphanPulls,
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
      for (const { path } of unseen) next[path] = readExpanded(id, path) ?? false;
      return next;
    });
  }, [id, worktrees]);

  // Auto-expand a card once when its checkout has a failing run, unless the
  // user already made an explicit choice for that card.
  useEffect(() => {
    for (const { branch, path } of worktrees) {
      if (autoExpanded.current.has(path)) continue;
      if (readExpanded(id, path) !== null) continue;
      if (!(runsByBranch[branch] ?? []).some((run) => run.conclusion === 'failure')) continue;

      autoExpanded.current.add(path);
      setExpandedPaths((prev) => ({ ...prev, [path]: true }));
    }
  }, [id, runsByBranch, worktrees]);

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

  const orphans = getOrphanPulls(worktrees.map((worktree) => worktree.branch)).filter(({ tags }) => tags.length > 0);
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
      <div
        className={cn(
          'group flex relative items-center justify-between min-h-[40px] py-1 pl-5 pr-4 gap-2.5',
          'bg-bp-light-gray-4 dark:bg-bp-dark-gray-2',
          'mt-1.5 first:mt-0'
        )}
      >
        <div
          className={cn(
            'flex items-baseline min-w-0 gap-2 overflow-hidden',
            loading && !gitStatus && Classes.SKELETON
          )}
        >
          <div className="font-medium truncate">{name}</div>

          <div className={cn('text-[11px] font-light truncate', Classes.TEXT_MUTED)}>
            {gitStatus?.organization ?? 'Local git'}
          </div>
        </div>

        <div className="flex items-center shrink-0 gap-1 select-none">
          <Icon
            className={cn('opacity-0', loading && 'animate-[blink_3s_infinite]')}
            color={Colors.ORANGE1}
            icon="dot"
          />

          {/* The ⋯ stays mounted and is only faded, so revealing it never moves
              the row. An opacity-0 button is still tabbable, and focus-within
              reveals it for keyboard users. */}
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
            onClosing={() => setMenuOpen(false)}
            onOpening={() => setMenuOpen(true)}
            placement="auto-end"
          >
            <Button
              className={cn(
                'opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100',
                menuOpen && 'opacity-100'
              )}
              icon="more"
              intent={behind ? 'warning' : 'none'}
              minimal
              title="Project actions"
            />
          </Popover>
        </div>
      </div>

      {worktrees.map((worktree) => (
        <Fragment key={worktree.path}>
          <CheckoutCard
            expanded={Boolean(expandedPaths[worktree.path])}
            gitStatus={worktree.isMain ? gitStatus : undefined}
            onHidePull={hidePull}
            onHideRun={hideRun}
            onIgnoreWorkflow={ignoreWorkflow}
            onRefresh={updateProject}
            onToggleExpanded={() => toggleExpanded(worktree.path)}
            project={project}
            pulls={pullsByBranch[worktree.branch] ?? []}
            runs={runsByBranch[worktree.branch] ?? []}
            runsLoaded={runsLoaded}
            worktree={worktree}
          />

          {worktree.isMain && orphans.length > 0 && (
            <div className="pl-5">
              {orphans.map(({ pull, tags }) => (
                <PullRequest
                  key={pull.id}
                  onHide={hidePull}
                  projectId={id}
                  pull={pull}
                  tags={tags}
                />
              ))}
            </div>
          )}
        </Fragment>
      ))}
    </>
  );
};
