import { Button, ButtonGroup, Icon, Menu, MenuItem, Popover, Tooltip } from '@blueprintjs/core';
import { type CSSProperties, type FC, useEffect, useState } from 'react';
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
  const [checks, setChecks] = useState<Check[]>([]);

  useEffect(() => {
    const fetchChecks = async () => {
      const res = await window.bridge.gitAPI.getPRChecks(projectId, number);
      if (res.success && res.checks) {
        setChecks(res.checks);
      }
    };
    fetchChecks();
  }, [projectId, number]);

  const openInBrowser = () => {
    window.open(html_url, '_blank');
  };

  const summary = getChecksSummary(checks);

  return (
    <div
      className={cn(
        // pr-2, not pr-4: the group around this row is inset by mx-2, so the
        // buttons still line up with the checkout row's buttons above.
        'flex relative items-center justify-between min-h-[45px] py-1 pl-5 pr-2 gap-3 mt-0.5',
        'bg-bp-light-gray-4 dark:bg-bp-dark-gray-2'
      )}
    >
      <div className="overflow-hidden flex flex-1 min-w-0 text-left justify-start gap-4 items-center">
        <img
          alt={user.login}
          className="w-[30px] h-[30px] rounded-full object-cover shrink-0"
          src={user.avatar_url}
        />

        <div className="overflow-hidden flex flex-col min-w-0">
          <div className="flex items-center overflow-hidden mb-0.5 gap-2">
            {draft && '[DRAFT] '}

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

            {/* The title is the only part that may shrink — badges and labels
                keep their width so a long title never slides under the
                buttons on the right. It wraps to two lines before it clips. */}
            <span className="line-clamp-2 break-words min-w-0">{title}</span>

            {/* GitHub's raw label colour as a solid fill reads as a stray block
                against the row. The colour survives as a tint and as the text,
                so a label stays recognisable but sits in the same visual family
                as the tags beside it. */}
            {labels.map((label: { color: string; id: number; name: string }) => (
              <div
                className={cn(
                  'rounded-full border px-1.5 py-px text-[10px] shrink-0',
                  // No fill: a tinted chip reads as a different surface from
                  // whatever it sits on. Border and text carry the colour.
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

            {tags.map((tag) => (
              <div
                className={cn(
                  'rounded-full border border-bp-gray-2 dark:border-bp-gray-3 px-1.5 py-px text-[10px]',
                  'text-bp-gray-1 dark:text-bp-gray-4'
                )}
                key={`${number}-${tag}`}
              >
                {tag}
              </div>
            ))}
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
      </div>

      <ButtonGroup>
        <Tooltip compact
          content="Open in browser"
          hoverOpenDelay={500}
          placement="bottom"
        >
          <Button
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
          <Button icon="caret-down" />
        </Popover>
      </ButtonGroup>
    </div>
  );
};
