import { Button } from '@blueprintjs/core';
import { FC } from 'react';

import { Pull } from 'types/gitHub';

import { MainBlock, Root, Title, TitleDescription, TitleMain } from './PullRequest.styles';

type Props = {
  pull: Pull;
};

export const PullRequest: FC<Props> = ({ pull }) => {
  const { title, html_url, draft, created_at } = pull;

  const openInBrowser = () => {
    window.open(html_url, '_blank');
  };

  const created = new Date(created_at).toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <Root>
      <MainBlock>
        <Title>
          <TitleMain>
            {draft && '[DRAFT] '}
            {title}
          </TitleMain>

          <TitleDescription>{created}</TitleDescription>
        </Title>
      </MainBlock>

      <Button
        icon="globe"
        onClick={openInBrowser}
      />
    </Root>
  );
};
