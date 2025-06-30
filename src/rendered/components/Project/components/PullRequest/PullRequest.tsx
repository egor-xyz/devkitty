import { Button } from '@blueprintjs/core';
import { readableColor } from 'polished';
import { type FC } from 'react';
import { timeAgo } from 'rendered/utils/timeAgo';
import { type Pull } from 'types/gitHub';

type Props = {
  pull: Pull;
};

export const PullRequest: FC<Props> = ({ pull }) => {
  const { created_at, draft, html_url, labels, number, title, user } = pull;

  const openInBrowser = () => {
    window.open(html_url, '_blank');
  };

  return (
    <div className="flex relative items-center justify-between min-h-5 py-1.5 px-5 pl-5 bg-blueprint-light-gray4 dark:bg-blueprint-dark-gray2 my-0.5 [&+&]:mt-0 first:pt-2.5">
      <div className="overflow-hidden flex text-left justify-start gap-4 items-center">
        <img
          alt={user.login}
          className="w-7.5 h-7.5 rounded-full object-cover"
          src={user.avatar_url}
        />

        <div className="overflow-hidden text-sm flex flex-col">
          <div className="flex items-center overflow-hidden text-ellipsis whitespace-nowrap mb-0.5 gap-2">
            {draft && '[DRAFT] '}

            {user.type === 'Bot' && (
              <div className="rounded border border-black px-1 py-0.5 text-xs text-black dark:text-blueprint-gray3 dark:border-blueprint-gray3">
                bot
              </div>
            )}

            {title}

            {labels.map((label: any) => (
              <div
                className="rounded px-1 py-0.5 text-xs"
                key={label.id}
                style={{
                  backgroundColor: `#${label.color}`,
                  color: readableColor(`#${label.color}`)
                }}
              >
                {label.name}
              </div>
            ))}
          </div>

          <div className="flex items-center overflow-hidden whitespace-nowrap text-ellipsis -mt-0.5 text-xs font-light dark:text-blueprint-gray3">
            #{number} opened {timeAgo(created_at)} by {user.login.replace('[bot]', '')}
          </div>
        </div>
      </div>

      <Button
        icon="globe"
        onClick={openInBrowser}
      />
    </div>
  );
};
