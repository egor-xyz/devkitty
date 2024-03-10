import { Button, CompoundTag } from '@blueprintjs/core';
import { FC } from 'react';

import { getStatusIcon } from 'rendered/assets/gitHubIcons';
import { Run } from 'types/gitHub';

import { Event, Root, Status, Title, TitleDescription, TitleText } from './Workflow.styles';

type Props = {
  run: Run;
};

export const Workflow: FC<Props> = ({
  run: { display_title, name, run_number, head_branch, event, status, html_url }
}) => {
  const Icon = getStatusIcon(status);

  const openInBrowser = () => {
    window.open(html_url, '_blank');
  };

  return (
    <Root>
      <Title>
        <Status>
          <Icon title={status} />
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
          leftContent={head_branch}
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
