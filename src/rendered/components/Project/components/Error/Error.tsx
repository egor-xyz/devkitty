import { Button, Tag } from '@blueprintjs/core';
import { type FC } from 'react';

import { Info, MiddleBlock, ProjectActions, Root, Title } from '../../Project.styles';

type Props = {
  name: string;
  removeAlert: () => void;
};

export const Error: FC<Props> = ({ name, removeAlert }) => (
  <Root>
    <Info>
      <Title>{name}</Title>
    </Info>

    <MiddleBlock>
      <Tag
        icon="folder-open"
        intent="warning"
        minimal
      >
        Git repository not found
      </Tag>
    </MiddleBlock>

    <ProjectActions>
      <Button
        icon="trash"
        intent="danger"
        large
        onClick={removeAlert}
      />
    </ProjectActions>
  </Root>
);
