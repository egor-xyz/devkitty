import { Button } from '@blueprintjs/core';
import { type FC } from 'react';
import { timeAgo } from 'rendered/utils/timeAgo';
import { type Pull } from 'types/gitHub';

import { Avatar, BotTag, MainBlock, PullLabel, Root, Title, TitleDescription, TitleMain } from './PullRequest.styles';

type Props = {
  pull: Pull;
};

export const PullRequest: FC<Props> = ({ pull }) => {
  const { created_at, draft, html_url, labels, number, title, user } = pull;

  const openInBrowser = () => {
    window.open(html_url, '_blank');
  };

  return (
    <Root>
      <MainBlock>
        <Avatar
          alt={user.login}
          src={user.avatar_url}
        />

        <Title>
          <TitleMain>
            {draft && '[DRAFT] '}
            {user.type === 'Bot' && <BotTag>bot</BotTag>}
            {title}

            {labels.map((label) => (
              <PullLabel
                $bgColor={label.color}
                key={label.id}
              >
                {label.name}
              </PullLabel>
            ))}
          </TitleMain>

          <TitleDescription>
            #{number} opened {timeAgo(created_at)} by {user.login.replace('[bot]', '')}
          </TitleDescription>
        </Title>
      </MainBlock>

      <Button
        icon="globe"
        onClick={openInBrowser}
      />
    </Root>
  );
};
