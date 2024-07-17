import { Button } from '@blueprintjs/core';
import { FC } from 'react';

import { getStatusIcon } from 'rendered/assets/gitHubIcons';
import { Run } from 'types/gitHub';

import { MainBlock, Root, Status, Title, TitleDescription, TitleMain } from './Workflow.styles';

type Props = {
  run: Run;
};

const tagLength = 75;

export const Workflow: FC<Props> = ({ run }) => {
  const { name, html_url, head_branch, run_number, event, status, display_title, conclusion } = run;
  const Icon = getStatusIcon(conclusion || status);

  const openInBrowser = () => {
    window.open(html_url, '_blank');
  };

  return (
    <Root>
      <MainBlock>
        <Status title={conclusion || status}>
          <Icon />
        </Status>

        <Title>
          <TitleMain>{display_title}</TitleMain>
          <TitleDescription>
            <b>{name}</b> #{run_number}
            {' | '}
            {head_branch.length > tagLength ? `${head_branch.slice(0, tagLength)}...` : head_branch}
            {' | '}
            {event !== 'workflow_dispatch' ? event : 'manual'}
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
