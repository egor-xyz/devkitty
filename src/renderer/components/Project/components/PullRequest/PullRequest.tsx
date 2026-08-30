import { Button, ButtonGroup, Icon, Menu, MenuItem, Popover, Tooltip } from '@blueprintjs/core';
import { type CSSProperties, type FC, useEffect, useState } from 'react';
import { useIsSunset } from 'renderer/hooks/useAppSettings';
import { cn } from 'renderer/utils/cn';
import { timeAgo } from 'renderer/utils/timeAgo';
import { type Pull } from 'types/gitHub';

type Check = {
  conclusion: null | string;
  id: number;
  name: string;
  status: string;
};

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

const reviewerStatus = (r: Reviewer): { color: string; icon: 'chat' | 'cross' | 'dot' | 'tick'; label: string } => {
  // Icons mirror GitHub's Reviewers panel 1:1: bare green check for approved,
  // red cross for changes requested, a comment bubble for a commented review,
  // and a faint dot for an awaiting/requested reviewer.
  if (r.state === 'approved') return { color: 'text-[#3fb950]', icon: 'tick', label: 'approved' };
  if (r.state === 'changes_requested') return { color: 'text-[#f85149]', icon: 'cross', label: 'requested changes' };
  if (r.state === 'commented') return { color: 'text-bp-gray-3', icon: 'chat', label: 'commented' };
  return { color: 'text-bp-gray-3', icon: 'dot', label: 'awaiting review' };
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
  const isMerged = Boolean(merged_at);
  const isClosed = !isMerged && state === 'closed';
  const isSunset = useIsSunset();
  const [checks, setChecks] = useState<Check[]>([]);
  const [review, setReview] = useState<null | Review>(null);

  useEffect(() => {
    const fetchChecks = async () => {
      const res = await window.bridge.gitAPI.getPRChecks(projectId, number);
      if (res.success && res.checks) {
        setChecks(res.checks);
      }
      if (res.success && res.review) {
        setReview(res.review);
      }
    };
    fetchChecks();
  }, [projectId, number]);

  const openInBrowser = () => {
    window.open(html_url, '_blank');
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
        'flex relative items-center justify-between min-h-[45px] py-1 pl-5 pr-2 gap-3 mt-0.5',
        isSunset ? 'dk-sunset-row' : 'bg-bp-light-gray-4 dark:bg-bp-dark-gray-2'
      )}
    >
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

          <div className="flex items-center overflow-hidden whitespace-nowrap text-ellipsis -mt-px text-xs font-light dark:text-bp-gray-3 gap-2">
            #{number} opened {timeAgo(created_at)} by {user.login.replace('[bot]', '')}

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
          </div>
        </div>

        {/* Labels + tags sit here, not in the title line, so they centre
            against the full card height (like the avatar and buttons) even when
            the title wraps to two lines. */}
        {(labels.length > 0 || tags.length > 0 || review?.state || reviewers.length > 0 || draft) && (
          <div className="flex items-center gap-2 shrink-0">
            {labels.map((label: { color: string; id: number; name: string }) => (
              <div
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] shrink-0',
                  'border-[color-mix(in_srgb,var(--label)_45%,transparent)]',
                  'text-[color-mix(in_srgb,var(--label)_70%,black)]',
                  'dark:text-[color-mix(in_srgb,var(--label)_80%,white)]'
                )}
                key={label.id}
                style={{ '--label': `#${label.color}` } as CSSProperties}
              >
                {label.name}
              </div>
            ))}

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

            {/* Review verdict renders LAST so it sits closest to the action
                buttons. A draft PR is not reviewable, so it shows a "Draft"
                badge instead of any review state. Otherwise, GitHub-style:
                green "Approved", red "Changes requested", or neutral "In review"
                while awaiting a verdict. Hover opens the full Reviewers panel. */}
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
      </div>

      <ButtonGroup>
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
  );
};
