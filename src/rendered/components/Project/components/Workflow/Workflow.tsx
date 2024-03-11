import { Button, CompoundTag } from '@blueprintjs/core';
import { FC } from 'react';

import { getStatusIcon } from 'rendered/assets/gitHubIcons';
import { Run } from 'types/gitHub';

import { Event, Root, Status, Title, TitleDescription, TitleText } from './Workflow.styles';

type Props = {
  run: Run;
};

const tagLength = 12;

export const Workflow: FC<Props> = ({ run }) => {
  const { name, html_url, head_branch, run_number, event, status, display_title, conclusion } = run;
  const Icon = getStatusIcon(conclusion || status);

  const openInBrowser = () => {
    window.open(html_url, '_blank');
  };

  return (
    <Root>
      <Title>
        <Status title={conclusion || status}>
          <Icon />
        </Status>

        <TitleText>
          <div>{display_title}</div>
          <TitleDescription>
            <b>{name}</b> #{run_number}
          </TitleDescription>
        </TitleText>
      </Title>

      <Event>
        <CompoundTag
          minimal
          round
          leftContent={head_branch.length > tagLength ? `${head_branch.slice(0, tagLength)}...` : head_branch}
          title={head_branch.length > tagLength ? head_branch : undefined}
        >
          {event !== 'workflow_dispatch' ? event : 'manual'}
        </CompoundTag>
      </Event>

      <Button
        icon="globe"
        onClick={openInBrowser}
      />
    </Root>
  );
};
