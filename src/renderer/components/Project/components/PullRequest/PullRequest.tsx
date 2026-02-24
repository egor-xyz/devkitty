import { Button } from '@blueprintjs/core';
import { readableColor } from 'polished';
import { type FC } from 'react';
import { cn } from 'renderer/utils/cn';
import { timeAgo } from 'renderer/utils/timeAgo';
import { type Pull } from 'types/gitHub';

type Props = {
  pull: Pull;
  tags?: string[];
};

export const PullRequest: FC<Props> = ({ pull, tags = [] }) => {
  const { created_at, draft, html_url, labels, number, title, user } = pull;

  const openInBrowser = () => {
    window.open(html_url, '_blank');
  };

  return (
    <div
      className={cn(
        'flex relative items-center justify-between min-h-[45px] py-1 pl-5 pr-4 mt-0.5',
        'bg-bp-light-gray-4 dark:bg-bp-dark-gray-2'
      )}
    >
      <div className="overflow-hidden flex text-left justify-start gap-4 items-center">
        <img
          alt={user.login}
          className="w-[30px] h-[30px] rounded-full object-cover"
          src={user.avatar_url}
        />

        <div className="overflow-hidden flex flex-col">
          <div className="flex items-center overflow-hidden text-ellipsis whitespace-nowrap mb-0.5 gap-2">
            {draft && '[DRAFT] '}

            {user.type === 'Bot' && (
              <div className="rounded border border-black dark:border-bp-gray-3 px-1 py-px text-[10px] text-black dark:text-bp-gray-3">
                bot
              </div>
            )}

            {title}

            {labels.map((label) => (
              <div
                className="rounded px-1 py-px text-xs"
                key={label.id}
                style={{
                  backgroundColor: `#${label.color}`,
                  color: readableColor(`#${label.color}`)
                }}
              >
                {label.name}
              </div>
            ))}

            {tags.map((tag) => (
              <div
                className={cn(
                  'rounded-full border border-bp-gray-2 dark:border-bp-gray-3 px-1.5 py-px text-[10px]',
                  'text-bp-gray-1 dark:text-bp-gray-4 bg-bp-light-gray-5 dark:bg-bp-dark-gray-4'
                )}
                key={`${number}-${tag}`}
              >
                {tag}
              </div>
            ))}
          </div>

          <div className="flex items-center overflow-hidden whitespace-nowrap text-ellipsis -mt-px text-xs font-light dark:text-bp-gray-3">
            #{number} opened {timeAgo(created_at)} by {user.login.replace('[bot]', '')}
          </div>
        </div>
      </div>

      <div className="flex gap-1 items-center shrink-0 justify-end min-w-[100px]">
        <Button
          icon="globe"
          onClick={openInBrowser}
        />
      </div>
    </div>
  );
};
