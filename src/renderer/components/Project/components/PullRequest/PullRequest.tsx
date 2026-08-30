import { Button, ButtonGroup, Icon, Menu, MenuDivider, MenuItem, Popover, Tooltip } from '@blueprintjs/core';
import { type FC, useCallback, useEffect, useState } from 'react';
import { FaCopy, FaRegCopy } from 'react-icons/fa';
import { useIsSunset } from 'renderer/hooks/useAppSettings';
import { appToaster } from 'renderer/utils/appToaster';
import { cn } from 'renderer/utils/cn';
import { refreshEvent } from 'renderer/utils/refresh';
import { timeAgo } from 'renderer/utils/timeAgo';
import { type Pull } from 'types/gitHub';

import { LabelStrip } from './LabelStrip';

type Check = {
  conclusion: null | string;
  id: number;
  name: string;
  status: string;
};

type MergeMethod = 'merge' | 'rebase' | 'squash';

type Props = {
  onHide?: (pullId: number, label: string) => void;
  projectId: string;
  pull: Pull;
  tags?: string[];
};

type Review = {
  approvedBy: string[];
  changesRequestedBy: string[];
  reviewers: Reviewer[];
  state: 'approved' | 'changes_requested' | null;
};

type Reviewer = {
  avatarUrl: string;
  login: string;
  reReviewRequested: boolean;
  state: 'approved' | 'changes_requested' | 'commented' | 'pending';
};

type UnresolvedThread = {
  avatarUrl: string;
  count: number;
  login: string;
  path: null | string;
};

const mergeMenuLabel: Record<MergeMethod, string> = {
  merge: 'Create a merge commit',
  rebase: 'Rebase and merge',
  squash: 'Squash and merge'
};

const autoMergeMenuLabel: Record<MergeMethod, string> = {
  merge: 'Enable auto-merge (merge commit)',
  rebase: 'Enable auto-merge (rebase)',
  squash: 'Enable auto-merge (squash)'
};

const reviewerStatus = (r: Reviewer): { color: string; icon: 'chat' | 'cross' | 'dot' | 'tick'; label: string } => {
  // Icons mirror GitHub's Reviewers panel 1:1: bare green check for approved,
  // red cross for changes requested, a comment bubble for a commented review,
  // and a faint dot for an awaiting/requested reviewer.
  if (r.state === 'approved') return { color: 'text-[#3fb950]', icon: 'tick', label: 'approved' };
  if (r.state === 'changes_requested') return { color: 'text-[#f85149]', icon: 'cross', label: 'requested changes' };
  if (r.state === 'commented') return { color: 'text-bp-gray-3', icon: 'chat', label: 'commented' };
  return { color: 'text-bp-gray-3', icon: 'dot', label: 'awaiting review' };
};

// Octokit error messages tack on a docs URL (" - https://docs.github.com/…").
// Strip it so toasts read as a plain, human sentence.
const cleanApiError = (message?: string, fallback = 'Something went wrong') => {
  if (!message) return fallback;
  const clean = message.split(' - http')[0].trim();
  return clean.length > 0 ? clean.charAt(0).toUpperCase() + clean.slice(1) : fallback;
};

const getChecksSummary = (checks: Check[]) => {
  if (checks.length === 0) return null;

  const success = checks.filter((c) => c.conclusion === 'success').length;
  const failed = checks.filter((c) => c.conclusion === 'failure' || c.conclusion === 'timed_out' || c.conclusion === 'cancelled').length;
  const pending = checks.filter((c) => c.status !== 'completed').length;

  return { failed, pending, success, total: checks.length };
};

export const PullRequest: FC<Props> = ({ onHide, projectId, pull, tags = [] }) => {
  const { created_at, draft, html_url, labels, merged_at, number, state, title, user } = pull;
  const isSunset = useIsSunset();
  const [checks, setChecks] = useState<Check[]>([]);
  const [review, setReview] = useState<null | Review>(null);
  const [behind, setBehind] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [mergeableState, setMergeableState] = useState<string>('unknown');
  const [merging, setMerging] = useState(false);
  const [conflictFiles, setConflictFiles] = useState<null | string[]>(null);
  const [unresolvedComments, setUnresolvedComments] = useState(0);
  const [unresolvedThreads, setUnresolvedThreads] = useState<UnresolvedThread[]>([]);
  const [autoMergeAllowed, setAutoMergeAllowed] = useState(false);
  const [autoMergeEnabled, setAutoMergeEnabled] = useState(false);
  const [allowedMergeMethods, setAllowedMergeMethods] = useState<MergeMethod[]>([]);
  // Set the instant a merge succeeds so the action buttons clear immediately,
  // without waiting for the parent list to re-poll and hand down a merged pull.
  const [justMerged, setJustMerged] = useState(false);
  const [copyIcon, setCopyIcon] = useState(<FaRegCopy size={14} />);

  const isMerged = Boolean(merged_at) || justMerged;
  const isClosed = !isMerged && state === 'closed';
  const totalUnresolvedComments = unresolvedThreads.reduce((sum, t) => sum + t.count, 0);

  const applyChecks = useCallback((res: Awaited<ReturnType<typeof window.bridge.gitAPI.getPRChecks>>) => {
    if (!res.success) return;
    if (res.checks) setChecks(res.checks);
    if (res.review) setReview(res.review);
    setBehind(Boolean(res.behind));
    setMergeableState(res.mergeableState ?? 'unknown');
    setUnresolvedComments(res.unresolvedComments ?? 0);
    setUnresolvedThreads(res.unresolvedThreads ?? []);
    setAutoMergeAllowed(Boolean(res.autoMergeAllowed));
    setAutoMergeEnabled(Boolean(res.autoMergeEnabled));
    setAllowedMergeMethods(res.allowedMergeMethods ?? []);
  }, []);

  const fetchChecks = useCallback(async () => {
    applyChecks(await window.bridge.gitAPI.getPRChecks(projectId, number));
  }, [applyChecks, projectId, number]);

  // Refetch on mount, whenever the PR advances (new head commit / updated_at),
  // and on a slow interval so a base that moved on GitHub — which changes
  // "behind" / mergeable state without touching the PR object — is not shown
  // stale (e.g. an "Update branch" button lingering after the branch caught up).
  useEffect(() => {
    fetchChecks();
    const timer = setInterval(fetchChecks, 30000);
    return () => clearInterval(timer);

  }, [fetchChecks, pull.head?.sha, pull.updated_at]);

  // Navbar refresh also refreshes this PR's review / mergeable / behind /
  // unresolved states, not just runs and pulls.
  useEffect(() => {
    const onRefresh = () => fetchChecks();
    window.addEventListener(refreshEvent, onRefresh);
    return () => window.removeEventListener(refreshEvent, onRefresh);
  }, [fetchChecks]);

  const openInBrowser = () => {
    window.open(html_url, '_blank');
  };

  // Copy feedback matches the checkout card's "Copy path": the icon swaps to a
  // filled copy glyph for a second, no toast.
  const copyLink = () => {
    setCopyIcon(<FaCopy size={14} />);
    setTimeout(() => setCopyIcon(<FaRegCopy size={14} />), 1000);
    navigator.clipboard.writeText(html_url);
  };

  const updateBranch = async (method: 'merge' | 'rebase' = 'merge') => {
    setUpdating(true);
    const res = await window.bridge.gitAPI.updateBranch(projectId, number, method);
    const toaster = await appToaster;
    if (!res.success) {
      toaster.show({ icon: 'warning-sign', intent: 'warning', message: cleanApiError(res.message, 'Failed to update branch'), timeout: 0 });
      setUpdating(false);
      return;
    }
    toaster.show({ icon: 'git-merge', intent: 'success', message: `Updated #${number} with the base branch` });
    // GitHub recomputes the PR's behind/mergeable state asynchronously after
    // update-branch, so an immediate read still reports "behind". Poll fresh PR
    // data until it settles (or give up) instead of trusting one stale read.
    // The button stays in its updating spinner throughout, then clears on real
    // state — no flicker back to "Update branch".
    let settled = false;
    for (let attempt = 0; attempt < 6 && !settled; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 800 : 1500));
      const next = await window.bridge.gitAPI.getPRChecks(projectId, number);
      if (next.success && !next.behind) {
        applyChecks(next);
        settled = true;
      }
    }
    if (!settled) await fetchChecks();
    setUpdating(false);
  };

  const mergePR = async (method: 'merge' | 'rebase' | 'squash') => {
    setMerging(true);
    const res = await window.bridge.gitAPI.mergePR(projectId, number, method);
    const toaster = await appToaster;
    if (res.success) {
      toaster.show({ icon: 'git-merge', intent: 'success', message: `Merged #${number}` });
      setJustMerged(true);
      await fetchChecks();
    } else {
      toaster.show({ icon: 'warning-sign', intent: 'warning', message: cleanApiError(res.message, 'Failed to merge'), timeout: 0 });
    }
    setMerging(false);
  };

  const enableAutoMerge = async (method: 'merge' | 'rebase' | 'squash') => {
    setMerging(true);
    const res = await window.bridge.gitAPI.enableAutoMerge(projectId, number, method);
    const toaster = await appToaster;
    if (res.success) {
      toaster.show({ icon: 'automatic-updates', intent: 'success', message: `Auto-merge enabled for #${number}` });
      setAutoMergeEnabled(true);
      await fetchChecks();
    } else {
      toaster.show({ icon: 'warning-sign', intent: 'warning', message: cleanApiError(res.message, 'Failed to enable auto-merge'), timeout: 0 });
    }
    setMerging(false);
  };

  const disableAutoMerge = async () => {
    setMerging(true);
    const res = await window.bridge.gitAPI.disableAutoMerge(projectId, number);
    const toaster = await appToaster;
    if (res.success) {
      toaster.show({ icon: 'automatic-updates', intent: 'success', message: `Auto-merge disabled for #${number}` });
      setAutoMergeEnabled(false);
      await fetchChecks();
    } else {
      toaster.show({ icon: 'warning-sign', intent: 'warning', message: cleanApiError(res.message, 'Failed to disable auto-merge'), timeout: 0 });
    }
    setMerging(false);
  };

  // Only surface Merge when GitHub itself would allow it — an allow-list, not a
  // block-list, so ambiguous states never show a button that can't work:
  //   clean       — mergeable, all requirements met
  //   unstable    — mergeable, but non-required checks are failing/pending
  //   has_hooks   — mergeable, with pre-receive hooks
  // Everything else hides it: 'blocked' (review/checks required), 'dirty'
  // (conflicts), 'behind' (up-to-date IS required here), 'draft', and 'unknown'
  // (GitHub still computing — show nothing rather than a button that would fail).
  // Note: a branch can be behind base yet still 'clean' (up-to-date not
  // required) — that PR is mergeable, so Merge shows alongside Update branch.
  const isOpen = !isMerged && !isClosed && !draft;
  const canMerge = isOpen && ['clean', 'has_hooks', 'unstable'].includes(mergeableState);
  const hasConflicts = isOpen && mergeableState === 'dirty';

  // Only the merge methods this repo enables (GitHub's own order). Fall back to
  // all three if the repo settings could not be read, so the buttons still work.
  const mergeMethods: MergeMethod[] = allowedMergeMethods.length > 0 ? allowedMergeMethods : ['squash', 'merge', 'rebase'];
  const [primaryMethod] = mergeMethods;

  // The conflicting-file list is computed on demand (a local git merge-tree) the
  // first time the "Resolve conflicts" popover opens, then cached.
  const loadConflicts = async () => {
    if (conflictFiles !== null) return;
    setConflictFiles([]);
    const res = await window.bridge.gitAPI.getConflictFiles(projectId, number);
    if (res.success && res.files) setConflictFiles(res.files);
  };

  const summary = getChecksSummary(checks);

  // GitHub-style Reviewers panel: every reviewer with their avatar and current
  // status icon (approved / requested changes / commented / awaiting).
  const reviewers = review?.reviewers ?? [];
  const reviewersPanel = reviewers.length > 0 && (
    <div className="min-w-[240px] px-3.5 py-3">
      <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-bp-gray-3">Reviewers</div>

      <div className="flex flex-col gap-1">
        {reviewers.map((r) => {
          const status = reviewerStatus(r);
          return (
            <div className="flex items-center gap-2.5 rounded-md px-1.5 py-1 -mx-1.5 hover:bg-white/5"
              key={r.login}
            >
              {r.avatarUrl ? (
                <img alt={r.login}
                  className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-white/10"
                  src={r.avatarUrl}
                />
              ) : (
                <Icon className="shrink-0"
                  icon="user"
                  size={16}
                />
              )}

              <span className="flex-1 text-xs font-medium truncate">{r.login.replace('[bot]', '')}</span>

              {r.reReviewRequested && (
                <Tooltip compact
                  content="Re-review requested"
                >
                  <Icon className="text-bp-gray-3"
                    icon="refresh"
                    size={12}
                  />
                </Tooltip>
              )}

              <Tooltip compact
                content={status.label}
              >
                <Icon className={status.color}
                  icon={status.icon}
                  size={14}
                />
              </Tooltip>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        // pr-2, not pr-4: the group around this row is inset by mx-2, so the
        // buttons still line up with the checkout row's buttons above.
        'flex flex-col justify-center relative min-h-[45px] py-1 pl-5 pr-2 mt-0.5',
        isSunset ? 'dk-sunset-row' : 'bg-bp-light-gray-4 dark:bg-bp-dark-gray-2'
      )}
    >
      <div className="flex w-full items-center justify-between gap-3">
        <div className="overflow-hidden flex flex-1 min-w-0 text-left justify-start gap-4 items-center">
          <img
            alt={user.login}
            className="w-[30px] h-[30px] rounded-full object-cover shrink-0"
            src={user.avatar_url}
          />

          <div className="overflow-hidden flex flex-col min-w-0 flex-1">
            <div className="flex items-center overflow-hidden mb-0.5 gap-2">

              {/* GitHub's own state badges: purple merged, red closed, filled and
                carrying the matching icon. shrink-0 and nowrap — a state is
                never the thing worth truncating. */}
              {isMerged && (
                <div
                  className={cn(
                  'flex items-center gap-1 rounded-full px-1.5 py-0.5 shrink-0 whitespace-nowrap',
                  'text-[10px] text-white bg-[#8250df] dark:bg-[#8957e5]'
                )}
                >
                  <Icon icon="git-merge"
                    size={10}
                  />
                  Merged
                </div>
            )}

              {isClosed && (
                <div
                  className={cn(
                  'flex items-center gap-1 rounded-full px-1.5 py-0.5 shrink-0 whitespace-nowrap',
                  'text-[10px] text-white bg-[#cf222e] dark:bg-[#da3633]'
                )}
                >
                  <Icon icon="cross-circle"
                    size={10}
                  />
                  Closed
                </div>
            )}

              {user.type === 'Bot' && (
                <div
                  className={cn(
                  'rounded-full border border-bp-gray-2 dark:border-bp-gray-3 px-1.5 py-px text-[10px] shrink-0',
                  'text-bp-gray-1 dark:text-bp-gray-4'
                )}
                >
                  bot
                </div>
            )}

              {/* The title is the only part that may shrink. It wraps to two
                lines before it clips; the labels/tags live in a sibling that
                centres against the whole card, not just the title line. */}
              <span className="line-clamp-2 break-words min-w-0">{title}</span>
            </div>

            <div className="flex items-center overflow-hidden -mt-px text-xs font-light dark:text-bp-gray-3 gap-2">
              <span className="shrink-0">#{number}</span>

              <span
                className="truncate min-w-0 -ml-1"
                title={`opened ${timeAgo(created_at)} by ${user.login.replace('[bot]', '')}`}
              >
                opened {timeAgo(created_at)} by {user.login.replace('[bot]', '')}
              </span>

              {summary && (
                <Tooltip
                  content={
                    <div className="text-xs">
                      {summary.success > 0 && <div>{summary.success} passed</div>}
                      {summary.failed > 0 && <div>{summary.failed} failed</div>}
                      {summary.pending > 0 && <div>{summary.pending} pending</div>}
                    </div>
                }
                  placement="bottom"
                >
                  <span className="flex items-center gap-1 shrink-0">
                    {summary.failed > 0 ? (
                      <Icon icon="cross-circle"
                        intent="danger"
                        size={12}
                      />
                  ) : summary.pending > 0 ? (
                    <Icon className="text-bp-orange-3"
                      icon="time"
                      size={12}
                    />
                  ) : (
                    <Icon icon="tick-circle"
                      intent="success"
                      size={12}
                    />
                  )}

                    <span className="text-[10px]">
                      {summary.success}/{summary.total}
                    </span>
                  </span>
                </Tooltip>
            )}

              {/* Labels fill whatever room is left on this line. LabelStrip
                  shows the ones that fully fit and collapses the rest into a
                  +N pill (hover to see all) — so a wide card shows them inline
                  and a cramped one degrades gracefully instead of clipping. */}
              {labels.length > 0 && <LabelStrip labels={labels} />}
            </div>
          </div>
        </div>

        {/* Tags, unresolved count and review status — full-size pills, centred
          against the whole card next to the action buttons. */}
        {(tags.filter((tag) => tag !== 'My').length > 0 || review?.state || reviewers.length > 0 || draft || unresolvedComments > 0) && (
          <div className="flex items-center gap-2 shrink-0">
            {tags.filter((tag) => tag !== 'My').map((tag) => (
              <div
                className={cn(
                'rounded-full border border-bp-gray-2 dark:border-bp-gray-3 px-2.5 py-1 text-[11px]',
                'text-bp-gray-1 dark:text-bp-gray-4'
              )}
                key={`${number}-${tag}`}
              >
                {tag}
              </div>
          ))}

            {unresolvedComments > 0 && (
              <Popover
                content={
                  <div className="min-w-[220px] px-3.5 py-3">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-bp-gray-3">
                      {unresolvedComments} unresolved {unresolvedComments === 1 ? 'conversation' : 'conversations'}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {unresolvedThreads.map((t) => (
                        <div className="flex items-center gap-2"
                          key={`${t.login}-${t.path}-${t.count}`}
                        >
                          {t.avatarUrl ? (
                            <img alt={t.login}
                              className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-white/10"
                              src={t.avatarUrl}
                            />
                        ) : (
                          <Icon className="shrink-0"
                            icon="user"
                            size={16}
                          />
                        )}

                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-medium leading-tight">
                              {t.login.replace('[bot]', '')}

                              <span className="ml-1 text-[10px] font-normal text-bp-gray-3">
                                {t.count} {t.count === 1 ? 'comment' : 'comments'}
                              </span>
                            </span>

                            {t.path && <span className="text-[10px] font-mono text-bp-gray-3 truncate">{t.path}</span>}
                          </div>
                        </div>
                    ))}
                    </div>
                  </div>
              }
                interactionKind="hover"
                placement="bottom"
              >
                <div className="flex items-center gap-1 rounded-full border border-[#d98a3d]/45 px-2 py-1 text-[11px] text-[#d98a3d] shrink-0 cursor-default">
                  <Icon icon="chat"
                    size={12}
                  />

                  {totalUnresolvedComments}
                </div>
              </Popover>
          )}

            {/* A draft PR is not reviewable, so it shows a "Draft" badge instead
              of any review state. Otherwise GitHub-style: green "Approved", red
              "Changes requested", or neutral "In review". Hover opens the
              Reviewers panel. */}
            {draft && (
              <div className="flex items-center gap-1.5 rounded-full border border-bp-gray-2 dark:border-bp-gray-3 px-2.5 py-1 text-[11px] text-bp-gray-1 dark:text-bp-gray-4 shrink-0">
                <Icon icon="git-branch"
                  size={12}
                />
                Draft
              </div>
          )}

            {!draft && review?.state === 'approved' && (
              <Popover content={reviewersPanel || undefined}
                interactionKind="hover"
                placement="bottom"
              >
                <div className="flex items-center gap-1.5 rounded-full border border-[#1a7f37]/45 dark:border-[#3fb950]/45 px-2.5 py-1 text-[11px] text-[#1a7f37] dark:text-[#3fb950] shrink-0 cursor-default">
                  <Icon icon="tick-circle"
                    size={12}
                  />
                  Approved
                </div>
              </Popover>
          )}

            {!draft && review?.state === 'changes_requested' && (
              <Popover content={reviewersPanel || undefined}
                interactionKind="hover"
                placement="bottom"
              >
                <div className="flex items-center gap-1.5 rounded-full border border-[#cf222e]/45 dark:border-[#f85149]/45 px-2.5 py-1 text-[11px] text-[#cf222e] dark:text-[#f85149] shrink-0 cursor-default">
                  <Icon icon="cross-circle"
                    size={12}
                  />
                  Changes requested
                </div>
              </Popover>
          )}

            {!draft && !review?.state && reviewers.length > 0 && (
              <Popover content={reviewersPanel || undefined}
                interactionKind="hover"
                placement="bottom"
              >
                <div className="flex items-center gap-1.5 rounded-full border border-bp-gray-2 dark:border-bp-gray-3 px-2.5 py-1 text-[11px] text-bp-gray-1 dark:text-bp-gray-4 shrink-0 cursor-default">
                  <Icon icon="eye-open"
                    size={12}
                  />
                  In review
                </div>
              </Popover>
          )}
          </div>
      )}

        <div className="flex items-center gap-1.5 shrink-0">
          {/* "Update branch" split button — Blueprint buttons so it inherits the
            exact same surface as the other action buttons (globe / caret) in
            every theme, Sunset included. Primary merges the base in; the caret
            offers merge vs rebase. Shown only when the branch is behind. */}
          {behind && isOpen && !hasConflicts && (
            <ButtonGroup>
              <Button
                icon="git-merge"
                loading={updating}
                onClick={() => updateBranch('merge')}
                text="Update branch"
              />

              <Popover
                content={
                  <Menu>
                    <MenuItem icon="git-merge"
                      onClick={() => updateBranch('merge')}
                      text="Update with merge commit"
                    />

                    <MenuItem icon="git-branch"
                      onClick={() => updateBranch('rebase')}
                      text="Update with rebase"
                    />
                  </Menu>
              }
                placement="bottom-end"
              >
                <Button aria-label="Update branch options"
                  icon="caret-down"
                />
              </Popover>
            </ButtonGroup>
        )}

          {/* GitHub-style green "Merge" split button: primary squash-merges; the
            caret offers merge commit / squash / rebase. Shown only when the PR
            is actually mergeable — no greyed-out placeholder. */}
          {canMerge && (
            <div className={cn('flex shrink-0 rounded-md overflow-hidden', merging && 'opacity-60')}>
              <button
                className="flex items-center gap-1.5 h-[30px] pl-2.5 pr-3 text-[12px] font-semibold text-white bg-[#1f883d] hover:bg-[#2ea043] active:bg-[#1a7f37] transition-colors disabled:cursor-not-allowed"
                disabled={merging}
                onClick={() => mergePR(primaryMethod)}
                type="button"
              >
                <Icon icon={merging ? 'refresh' : 'git-merge'}
                  size={13}
                />

                {merging ? 'Merging…' : mergeMenuLabel[primaryMethod]}
              </button>

              {(mergeMethods.length > 1 || (autoMergeAllowed && !autoMergeEnabled)) && (
                <Popover
                  content={
                    <Menu>
                      {mergeMethods.map((m) => (
                        <MenuItem icon="git-merge"
                          key={m}
                          onClick={() => mergePR(m)}
                          text={mergeMenuLabel[m]}
                        />
                    ))}

                      {autoMergeAllowed && !autoMergeEnabled && (
                        <>
                          <MenuDivider />

                          {mergeMethods.map((m) => (
                            <MenuItem icon="automatic-updates"
                              key={`auto-${m}`}
                              onClick={() => enableAutoMerge(m)}
                              text={autoMergeMenuLabel[m]}
                            />
                        ))}
                        </>
                    )}
                    </Menu>
                }
                  disabled={merging}
                  placement="bottom-end"
                >
                  <button className="flex items-center h-[30px] px-1.5 text-white bg-[#1f883d] hover:bg-[#2ea043] active:bg-[#1a7f37] transition-colors border-l border-black/20 disabled:cursor-not-allowed"
                    disabled={merging}
                    type="button"
                  >
                    <Icon icon="caret-down"
                      size={12}
                    />
                  </button>
                </Popover>
            )}
            </div>
        )}

          {/* Auto-merge is armed: show its state with a one-click disable. */}
          {isOpen && autoMergeEnabled && (
            <Popover
              content={
                <Menu>
                  <MenuItem icon="disable"
                    onClick={disableAutoMerge}
                    text="Disable auto-merge"
                  />
                </Menu>
            }
              placement="bottom-end"
            >
              <div className="flex items-center gap-1.5 h-[30px] px-3 rounded-md text-[12px] font-medium text-[#3fb950] bg-[#3fb950]/10 border border-[#3fb950]/35 cursor-pointer shrink-0">
                <Icon icon="automatic-updates"
                  size={13}
                />
                Auto-merge on
              </div>
            </Popover>
        )}

          {/* Conflicts: GitHub shows an unclickable "Resolve conflicts" button —
            conflicts can only be fixed on the command line. Hovering lists the
            conflicting files (computed locally on demand). */}
          {hasConflicts && (
            <Popover
              content={
                <div className="min-w-[240px] px-3.5 py-3">
                  <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#f0e9f8]">
                    <Icon className="text-[#d98a3d]"
                      icon="warning-sign"
                      size={13}
                    />
                    This branch has conflicts
                  </div>

                  <div className="mt-1 text-[11px] text-bp-gray-3">Resolve them on the command line before merging.</div>

                  {conflictFiles === null || conflictFiles.length === 0 ? (
                    <div className="mt-2 text-[11px] text-bp-gray-3 italic">
                      {conflictFiles === null ? 'Finding conflicting files…' : 'Conflicting files unavailable.'}
                    </div>
                ) : (
                  <div className="mt-2 flex flex-col gap-1">
                    {conflictFiles.map((f) => (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#efe8f5]"
                        key={f}
                      >
                        <Icon className="text-bp-gray-3 shrink-0"
                          icon="document"
                          size={12}
                        />

                        <span className="truncate">{f}</span>
                      </div>
                    ))}
                  </div>
                )}
                </div>
            }
              interactionKind="hover"
              onOpening={loadConflicts}
              placement="bottom-end"
            >
              <div className="flex items-center gap-1.5 h-[30px] px-3 rounded-md text-[12px] font-medium text-[#f85149] bg-[#f85149]/10 border border-[#f85149]/35 cursor-not-allowed select-none shrink-0">
                <Icon icon="warning-sign"
                  size={13}
                />
                Resolve conflicts
              </div>
            </Popover>
        )}

          <ButtonGroup>
            <Tooltip compact
              content="Copy pull request link"
              hoverOpenDelay={500}
              placement="bottom"
            >
              <Button
                aria-label="Copy pull request link"
                icon={copyIcon}
                onClick={copyLink}
              />
            </Tooltip>

            <Tooltip compact
              content="Open in browser"
              hoverOpenDelay={500}
              placement="bottom"
            >
              <Button
                aria-label="Open pull request in browser"
                icon="globe"
                onClick={openInBrowser}
              />
            </Tooltip>

            <Popover
              content={
                <Menu>
                  {/* Auto-merge lives here rather than as an always-on button —
                    it is a "set and forget" action, not a primary one. */}
                  {isOpen && !hasConflicts && autoMergeAllowed && !autoMergeEnabled && (
                    <>
                      {mergeMethods.map((m) => (
                        <MenuItem icon="automatic-updates"
                          key={`auto-${m}`}
                          onClick={() => enableAutoMerge(m)}
                          text={autoMergeMenuLabel[m]}
                        />
                    ))}

                      {onHide && <MenuDivider />}
                    </>
                )}

                  {isOpen && autoMergeEnabled && (
                    <>
                      <MenuItem icon="disable"
                        onClick={disableAutoMerge}
                        text="Disable auto-merge"
                      />

                      {onHide && <MenuDivider />}
                    </>
                )}

                  {onHide && (
                    <MenuItem
                      icon="eye-off"
                      onClick={() => onHide(pull.id, `#${number} ${title}`)}
                      text="Hide this PR"
                    />
                )}
                </Menu>
            }
              placement="bottom-end"
            >
              <Button aria-label="Pull request actions"
                icon="caret-down"
              />
            </Popover>
          </ButtonGroup>
        </div>
      </div>
    </div>
  );
};
